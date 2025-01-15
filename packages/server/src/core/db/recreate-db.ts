import fs from 'fs';
import path from 'path';
import PdfParse from 'pdf-parse';
import { dataType, vectorizer, WeaviateClient } from 'weaviate-client';
import Db from './db';

const pdfDir = path.resolve(__dirname, '../manuals');

async function recreateDb() {
	const db = await Db.getClient();

	await db.collections.deleteAll();

	await createCollections(db);
	const accountIds = await createAccounts(db);
	await createUsers(db, accountIds);
	const equipmentIds = await createEquipments(db, accountIds);
	await createDocuments(db, accountIds, equipmentIds);

	console.log('Database recreated');
}

async function createCollections(db: WeaviateClient): Promise<void> {
	await db.collections.create({
		name: 'Account',
		properties: [
			{ name: 'name', dataType: dataType.TEXT, skipVectorization: true },
			{ name: 'logoUrl', dataType: dataType.TEXT, skipVectorization: true },
		],
	});

	await db.collections.create({
		name: 'User',
		properties: [
			{ name: 'name', dataType: dataType.TEXT, skipVectorization: true },
			{ name: 'email', dataType: dataType.TEXT, skipVectorization: true },
			{ name: 'password', dataType: dataType.TEXT, skipVectorization: true },
			{ name: 'avatarUrl', dataType: dataType.TEXT, skipVectorization: true },
		],
		references: [{ name: 'accountId', targetCollection: 'Account' }],
	});

	await db.collections.create({
		name: 'Equipment',
		properties: [
			{ name: 'name', dataType: dataType.TEXT, skipVectorization: true },
			{ name: 'description', dataType: dataType.TEXT, skipVectorization: true },
			{
				name: 'serialNumber',
				dataType: dataType.TEXT,
				skipVectorization: true,
			},
		],
		references: [{ name: 'accountId', targetCollection: 'Account' }],
	});

	await db.collections.create({
		name: 'Document',
		vectorizers: vectorizer.text2VecTransformers(),
		properties: [
			{ name: 'title', dataType: dataType.TEXT, skipVectorization: true },
			{ name: 'content', dataType: dataType.TEXT },
		],
		references: [
			{ name: 'equipmentId', targetCollection: 'Equipment' },
			{ name: 'accountId', targetCollection: 'Account' },
		],
	});
}

async function createAccounts(db: WeaviateClient): Promise<string[]> {
	const Account = db.collections.get('Account');

	const uuid = await Account.data.insertMany([
		{
			id: 'f872a347-6898-4892-9a92-4950b5612741',
			properties: {
				name: 'Admin',
				logoUrl: 'https://via.placeholder.com/150',
			},
		},
	]);

	console.log('Inserted accounts with UUIDs:', uuid);

	return uuid.uuids as string[];
}

async function createUsers(db: WeaviateClient, accountIds: string[]): Promise<void> {
	const User = db.collections.get('User');

	const uuid = await User.data.insertMany([
		{
			id: 'a3029d16-e21b-4af0-b8d6-b4c6aa7f3720',
			properties: {
				name: 'Kelly Pilati',
				email: 'kelly-pilati@tuamaeaquelaursa.com',
				password: '$2b$10$wjJIoKQfGEPFZdDnML/ohetSl.v7ffivlBKySqI2E/fLoPNBDajLq',
				avatarUrl: 'https://via.placeholder.com/150',
			},
			references: {
				accountId: accountIds[0],
			},
		},
	]);

	console.log('Inserted users with UUIDs:', uuid);
}

async function createEquipments(db: WeaviateClient, accountIds: string[]): Promise<string[]> {
	const Equipment = db.collections.get('Equipment');

	const uuid = await Equipment.data.insertMany([
		{
			id: '010ff9e3-4c4d-49cb-93e9-de5a1602b373',
			properties: {
				name: 'Ar condicionado Daikin',
				description: 'Ar condicionado split inverter 12000 BTUs',
				serialNumber: '123456789',
			},
			references: {
				accountId: accountIds[0],
			},
		},
	]);

	console.log('Inserted equipments with UUIDs:', uuid);

	return uuid.uuids as string[];
}

async function createDocuments(db: WeaviateClient, accountIds: string[], equipmentIds: string[]): Promise<void> {
	const Document = db.collections.get('Document');

	const allPdfsParsed = await parseAllPdfs();

	for (const pdf of allPdfsParsed) {
		const sections = splitIntoSections(pdf.content);

		for (const section of sections) {
			await Document.data.insert({
				properties: {
					title: pdf.title,
					content: section,
				},
				references: {
					accountId: accountIds[0],
					equipmentId: equipmentIds[0],
				},
			});
		}
	}

	console.log('Inserted documents with sections');
}

async function parseAllPdfs(): Promise<{ title: string; content: string }[]> {
	if (!fs.existsSync(pdfDir)) {
		throw new Error(`Diretório não encontrado: ${pdfDir}`);
	}

	const pdfFiles = fs.readdirSync(pdfDir);
	const allPdfsParsed: {
		title: string;
		content: string;
	}[] = [];

	for (const pdfFile of pdfFiles) {
		const pdf = fs.readFileSync(path.join(pdfDir, pdfFile));
		const pdfParsed = await PdfParse(pdf);

		allPdfsParsed.push({
			title: pdfParsed.info.Title,
			content: pdfParsed.text,
		});
	}

	return allPdfsParsed;
}

function splitIntoSections(content: string): string[] {
	return content
		.split('\n\n')
		.map((section) => section.trim())
		.filter((section) => section.length);
}

(async () => {
	await recreateDb();
})();
