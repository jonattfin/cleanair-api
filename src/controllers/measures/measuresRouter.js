import { Router } from 'express';

import MeasuresController from './measuresController';
import repositories from '../../repositories';

import { logger, autoMapper } from '../../helpers';

const router = Router();
const controller = new MeasuresController({
  repositories,
  logger,
  autoMapper,
});

// routes

router.route('/get-year/:year')
  .get((req, res, next) => controller.getYearData(req, res, next));

router.route('/fetch-urad')
  .get((req, res, next) => controller.fetchUrad(req, res, next));

router.route('/process-urad')
  .get((req, res, next) => controller.processUrad(req, res, next));


export default router;
