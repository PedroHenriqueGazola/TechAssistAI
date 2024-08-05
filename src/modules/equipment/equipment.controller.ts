import { Application, Request, Response } from 'express';
import Controller, { Methods, RouteConfig } from '../../controller/controller';
import { EquipmentService } from './equipment.service';

export default class EquipmentController extends Controller {
	public path = '/equipments';
	public routes = [
		{
			path: '',
			method: Methods.GET,
			handler: this.search,
			localMiddleware: [],
		},
		{
			path: '/:id',
			method: Methods.GET,
			handler: this.getOne,
			localMiddleware: [],
		},
		{
			path: '',
			method: Methods.POST,
			handler: this.createEquipment,
			localMiddleware: [],
		},
	] as RouteConfig[];

	public constructor(app: Application) {
		super(app);
	}

	public async search(req: Request, res: Response): Promise<void> {
		try {
			const equipmentService = new EquipmentService();

			const equipments = await equipmentService.search();

			res.status(200).json({ equipments });
		} catch (error) {
			console.log(error);
			res.status(500).json({ error });
		}
	}

	public async getOne(req: Request, res: Response): Promise<void> {
		const { id } = req.params;

		if (!id) {
			res.status(400).json({ error: 'ID is required' });

			return;
		}

		try {
			const equipmentService = new EquipmentService();

			const equipment = await equipmentService.getOne(id);

			res.status(200).json({ equipment });
		} catch (error) {
			res.status(500).json({ error });
		}
	}

	public async createEquipment(req: Request, res: Response): Promise<void> {
		try {
			const equipmentService = new EquipmentService();

			const { valid, error } = equipmentService.validateCreateEquipment(req);

			if (!valid) {
				res.status(400).json({ error });
				return;
			}

			const { name, serialNumber, description } = req.body;

			const equipment = await equipmentService.createEquipment(
				name,
				serialNumber,
				description,
			);

			res.status(200).json({ equipment });
		} catch (error) {
			res.status(500).json({ error });
		}
	}
}