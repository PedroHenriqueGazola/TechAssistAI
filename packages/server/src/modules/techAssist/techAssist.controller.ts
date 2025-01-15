import { Application, Response } from 'express';
import Controller, { Methods, RouteConfig } from '../../core/controller/controller';
import { AuthenticatedRequest } from '../../core/middleware/auth.type';
import { TechAssistService } from './techAssist.service';

export default class TechAssistController extends Controller {
	public path = '/tech-assist';
	public routes = [
		{
			path: '/diagnose',
			method: Methods.POST,
			handler: this.diagnoseIssue,
			localMiddleware: [],
		},
	] as RouteConfig[];

	public constructor(app: Application) {
		super(app);
	}

	public async diagnoseIssue(req: AuthenticatedRequest, res: Response): Promise<void> {
		const { description, equipmentId } = req.body;

		if (!description || !equipmentId) {
			res.status(400).json({ error: 'Description and imageUrl are required' });

			return;
		}

		try {
			const techAssistService = new TechAssistService();

			await techAssistService.diagnoseIssue(
				{
					description,
					equipmentId,
				},
				res,
			);
		} catch (error) {
			console.log(error);
			res.status(500).json({ error });
		}
	}
}
