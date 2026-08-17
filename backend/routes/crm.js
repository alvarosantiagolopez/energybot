import { getAllContacts } from '../services/crmService.js';

export default async function crmRoutes(fastify) {
  fastify.get('/api/crm/contacts', async (request, reply) => {
    try {
      const contacts = await getAllContacts();
      return reply.send(contacts);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch CRM contacts' });
    }
  });
}
