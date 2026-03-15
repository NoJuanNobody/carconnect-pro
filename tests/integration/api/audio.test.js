'use strict';

const express = require('express');
const request = require('supertest');
const createAudioRouter = require('../../../src/api/routes/audio');

let app;
let audioService;

beforeEach(() => {
  app = express();
  app.use(express.json());
  const { router, service } = createAudioRouter();
  audioService = service;
  app.use('/api/v1/audio', router);
});

describe('GET /api/v1/audio/sources', () => {
  it('should return all audio sources', async () => {
    const res = await request(app).get('/api/v1/audio/sources');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.data.sources).toHaveLength(6);
    expect(res.body.data.activeSource).toBe('radio');
  });

  it('should include all expected source IDs', async () => {
    const res = await request(app).get('/api/v1/audio/sources');
    const ids = res.body.data.sources.map((s) => s.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'radio',
        'bluetooth',
        'usb',
        'aux',
        'android_auto',
        'apple_carplay',
      ]),
    );
  });

  it('should mark the active source', async () => {
    const res = await request(app).get('/api/v1/audio/sources');
    const activeSources = res.body.data.sources.filter((s) => s.active);

    expect(activeSources).toHaveLength(1);
    expect(activeSources[0].id).toBe('radio');
  });
});

describe('POST /api/v1/audio/source', () => {
  it('should switch audio source successfully', async () => {
    const res = await request(app)
      .post('/api/v1/audio/source')
      .send({ sourceId: 'bluetooth', fadeTime: 100 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.data.previousSource).toBe('radio');
    expect(res.body.data.currentSource).toBe('bluetooth');
    expect(res.body.data.transactionId).toBeDefined();
  });

  it('should use default fadeTime when not provided', async () => {
    const res = await request(app)
      .post('/api/v1/audio/source')
      .send({ sourceId: 'usb' });

    expect(res.status).toBe(200);
    expect(res.body.data.fadeTime).toBe(200);
  });

  it('should complete source switch within 500ms', async () => {
    const start = Date.now();
    const res = await request(app)
      .post('/api/v1/audio/source')
      .send({ sourceId: 'bluetooth', fadeTime: 300 });
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  it('should return 400 for invalid sourceId', async () => {
    const res = await request(app)
      .post('/api/v1/audio/source')
      .send({ sourceId: 'invalid_source' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
  });

  it('should return 400 when sourceId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/audio/source')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when fadeTime exceeds 500ms', async () => {
    const res = await request(app)
      .post('/api/v1/audio/source')
      .send({ sourceId: 'bluetooth', fadeTime: 600 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 409 for disconnected source', async () => {
    audioService.setSourceConnected('bluetooth', false);

    const res = await request(app)
      .post('/api/v1/audio/source')
      .send({ sourceId: 'bluetooth' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SOURCE_NOT_CONNECTED');
  });

  it('should reflect new active source in subsequent GET', async () => {
    await request(app)
      .post('/api/v1/audio/source')
      .send({ sourceId: 'aux' });

    const res = await request(app).get('/api/v1/audio/sources');

    expect(res.body.data.activeSource).toBe('aux');
    const activeSources = res.body.data.sources.filter((s) => s.active);
    expect(activeSources).toHaveLength(1);
    expect(activeSources[0].id).toBe('aux');
  });
});

describe('PATCH /api/v1/audio/control', () => {
  it('should update volume', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ volume: 75 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.data.controls.volume).toBe(75);
    expect(res.body.data.updatedFields.volume).toBe(75);
  });

  it('should update multiple controls at once', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ volume: 80, bass: 5, treble: -3 });

    expect(res.status).toBe(200);
    expect(res.body.data.controls.volume).toBe(80);
    expect(res.body.data.controls.bass).toBe(5);
    expect(res.body.data.controls.treble).toBe(-3);
    expect(Object.keys(res.body.data.updatedFields)).toHaveLength(3);
  });

  it('should update balance and fade', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ balance: -50, fade: 30 });

    expect(res.status).toBe(200);
    expect(res.body.data.controls.balance).toBe(-50);
    expect(res.body.data.controls.fade).toBe(30);
  });

  it('should return 400 for empty body', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when volume exceeds range', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ volume: 150 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when volume is below range', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ volume: -1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when balance exceeds range', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ balance: 101 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when bass exceeds range', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ bass: 15 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when treble exceeds range', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ treble: -11 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when fade exceeds range', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ fade: 101 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should accept boundary values', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ volume: 0, balance: -100, fade: 100, bass: -10, treble: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.controls.volume).toBe(0);
    expect(res.body.data.controls.balance).toBe(-100);
    expect(res.body.data.controls.fade).toBe(100);
    expect(res.body.data.controls.bass).toBe(-10);
    expect(res.body.data.controls.treble).toBe(10);
  });

  it('should strip unknown fields', async () => {
    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ volume: 50, unknownField: 'test' });

    expect(res.status).toBe(200);
    expect(res.body.data.updatedFields.unknownField).toBeUndefined();
  });

  it('should persist control changes', async () => {
    await request(app)
      .patch('/api/v1/audio/control')
      .send({ volume: 90 });

    const res = await request(app)
      .patch('/api/v1/audio/control')
      .send({ bass: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.controls.volume).toBe(90);
    expect(res.body.data.controls.bass).toBe(5);
  });
});
