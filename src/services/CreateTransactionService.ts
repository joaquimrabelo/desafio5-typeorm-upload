import { getCustomRepository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';
import AppError from '../errors/AppError';

interface Request {
  category: string;
  title: string;
  type: 'income' | 'outcome';
  value: number;
}
class CreateTransactionService {
  public async execute({
    category,
    title,
    type,
    value,
  }: Request): Promise<Transaction> {
    if (Number.isNaN(value)) {
      throw new AppError('This value is not a number');
    }
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('The value of outcome entry is invalid');
    }

    const categoriesRepository = getRepository(Category);
    const savedCategory = await categoriesRepository.findOne({
      where: { title: category },
    });
    let category_id;
    if (!savedCategory) {
      const newCategory = categoriesRepository.create({
        title: category,
      });
      await categoriesRepository.save(newCategory);
      category_id = newCategory.id;
    } else {
      category_id = savedCategory.id;
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id,
    });
    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
