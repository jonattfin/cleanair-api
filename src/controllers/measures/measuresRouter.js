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

router.route('/last-year')
  .get((req, res, next) => controller.getLastYear(req, res, next));

router.route('/urad')
  .get((req, res, next) => controller.getUrad(req, res, next));

router.route('/process-urad')
  .get((req, res, next) => controller.processUrad(req, res, next));


export default router;
