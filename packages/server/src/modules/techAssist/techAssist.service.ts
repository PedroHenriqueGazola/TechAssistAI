import { Response } from 'express';
import Db from '../../core/db/db';
import { OpenAISingleton } from '../../core/open-ai/openai';
import { DiagnoseIssueParams } from './techAssist.type';

export class TechAssistService {
  public async diagnoseIssue(params: DiagnoseIssueParams, res: Response): Promise<void> {
    const { description, equipmentId } = params;

    try {
      const db = await Db.getClient();

      const documentCollection = db.collections.get('Document');

      const { objects } = await documentCollection.query.hybrid(description, {
        alpha: 0.5,
        limit: 5,
        returnMetadata: ['score', 'distance', 'explainScore'],
        filters: documentCollection.filter.byRef('equipmentId').byId().equal(equipmentId),
      });

      if (!objects.length) {
        throw new Error('Document not found for the given equipment ID');
      }

      const manualContent = [];

      for (const object of objects) {
        const score = object.metadata?.['score'] || 0;
        if (score < 0.5) {
          continue;
        }

        manualContent.push(object.properties.content);
      }

      const text = manualContent.join('\n\n');

      const prompt = `
				Você é um assistente técnico altamente qualificado. Seu trabalho é fornecer diagnósticos claros e soluções práticas para problemas reportados em equipamentos com base nas descrições e nos manuais fornecidos.
        - Se o manual contiver informações diretamente relacionadas, use-as para gerar uma solução detalhada.
        - Se o problema não for abordado no manual, Faça pesquisas na internet para resolver o problema.

        Descrição do problema:
        ${description}

        Trecho relevante do manual:
        ${text}

        Com base nas informações acima, forneça:
        1. Uma explicação detalhada da causa do problema.
        2. Um conjunto de passos claros para resolver o problema.
        3. Lembre-se, você está se comunicando diretamente com um técnico, não forneça instruções genéricas ou informações irrelevantes, e nem peça para chamar um técnico.
			`;

      const openai = new OpenAISingleton().getOpenAI();

      const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente técnico que ajuda a diagnosticar problemas de equipamentos com base em descrições fornecidas pelos técnicos.',
          },
          { role: 'user', content: prompt },
        ],
        stream: true,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let buffer = '';

      for await (const part of stream) {
        const content = part.choices[0]?.delta?.content;
        if (content) {
          buffer += content;
          if (buffer.length > 100) {
            res.write(`${buffer}\n\n`);
            buffer = '';
          }
        }
      }

      if (buffer.length > 0) {
        res.write(`${buffer}\n\n`);
      }

      res.end();
    } catch (error) {
      console.log(error);
      throw new Error('Erro ao processar a consulta');
    }
  }
}
