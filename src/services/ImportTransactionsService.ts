import parse from 'csv-parse';
import path from 'path';
import fs from 'fs';

import { getCustomRepository, getRepository, In } from 'typeorm';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';

import uploadConfig from '../config/upload';

interface CSVTransaction {
  category: string;
  title: string;
  type: 'income' | 'outcome';
  value: number;
}

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const file = path.resolve(uploadConfig.directory, filename);
    const fileReadStrem = fs.createReadStream(file);
    const parser = parse({
      from_line: 2,
      delimiter: ',',
    });

    const parseCSV = fileReadStrem.pipe(parser);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async row => {
      const [title, type, value, category] = row.map((cell: string) =>
        cell.trim(),
      );
      if (title && type && value) {
        categories.push(category);
        transactions.push({ title, type, value, category });
      }
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );
    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createTransactions);

    await fs.promises.unlink(file);

    return createTransactions;
  }
}

export default ImportTransactionsService;
