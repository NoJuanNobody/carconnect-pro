'use strict';

class AudioController {
  constructor(audioService) {
    this.audioService = audioService;
  }

  getSources(req, res) {
    const sources = this.audioService.getSources();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        sources,
        activeSource: sources.find((s) => s.active)?.id || null,
      },
    });
  }

  async switchSource(req, res) {
    try {
      const { sourceId, fadeTime } = req.body;
      const result = await this.audioService.switchSource(sourceId, fadeTime);

      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        data: result,
      });
    } catch (error) {
      if (error.code === 'SOURCE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          timestamp: new Date().toISOString(),
          error: {
            code: 'SOURCE_NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.code === 'SOURCE_NOT_CONNECTED') {
        return res.status(409).json({
          success: false,
          timestamp: new Date().toISOString(),
          error: {
            code: 'SOURCE_NOT_CONNECTED',
            message: error.message,
          },
        });
      }

      return res.status(500).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  }

  updateControls(req, res) {
    const result = this.audioService.updateControls(req.body);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result,
    });
  }
}

module.exports = AudioController;
