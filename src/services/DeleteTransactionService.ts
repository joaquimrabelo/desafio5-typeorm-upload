import { getCustomRepository } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transaction = await transactionsRepository.findOne(id);
    if (!transaction) {
      throw new AppError('Transaction nod found.', 400);
    }
    transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
