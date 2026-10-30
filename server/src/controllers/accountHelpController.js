import { AccountHelpRequest } from '../models/index.js';

export async function createAccountHelpRequest(req, res, next) {
  try {
    await AccountHelpRequest.create({
      account_identifier: req.body.account_identifier,
      contact_email: req.body.contact_email,
      message: req.body.message,
    });
    return res.status(202).json({
      message: 'Permintaan bantuan tersimpan untuk ditinjau Admin. Tindak lanjut akan dilakukan secara manual melalui email yang dicantumkan.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function listAccountHelpRequests(req, res, next) {
  try {
    const requests = await AccountHelpRequest.findAll({
      where: { status: 'open' },
      attributes: ['id', 'account_identifier', 'contact_email', 'message', 'createdAt'],
      order: [['createdAt', 'ASC']],
      limit: 50,
    });
    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
}

export async function resolveAccountHelpRequest(req, res, next) {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isSafeInteger(requestId) || requestId < 1) {
      return res.status(404).json({ message: 'Permintaan bantuan tidak ditemukan.' });
    }

    const request = await AccountHelpRequest.findByPk(requestId);
    if (!request) return res.status(404).json({ message: 'Permintaan bantuan tidak ditemukan.' });
    if (request.status !== 'open') return res.status(409).json({ message: 'Permintaan ini sudah ditandai selesai.' });

    await request.update({ status: 'resolved', handled_by: req.user.id, handled_at: new Date() });
    return res.json({ request: { id: request.id, status: request.status } });
  } catch (error) {
    return next(error);
  }
}
