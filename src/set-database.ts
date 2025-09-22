
import knex from 'knex';
import knexConstructor from 'knex';
import { ConnectSessionKnexStore } from 'connect-session-knex';

import * as path from 'path';

export const pageModel = {
	title: 'string',
	slug: 'string',
	lang: 'string',
	description: 'string',
	content: 'string',
	image: 'string',
	url: 'string',
	position: 'string',
	metaTitle: 'string',
	hidden: 'string',
	onlyHTML: 'string'
};

export const blogModel = {
	title: 'string',
	slug: 'string',
	lang: 'string',
	description: 'string',
	content: 'string',
	image: 'string',
	author: 'string',
	date: 'date',
	categories: 'json',
	comments: 'json'
};

export const expenseModel = {
	title: 'string',
	slug: 'string',
	description: 'string',
	value: 'integer',
	repeat: 'string',
	lastPayment: 'date',
	currency: 'string',
	categories: 'json',
	user: 'string'
};

export const userModel = {
	username: 'string',
	email: 'string',
	password: 'string',
	salt: 'string',
	token: 'string',
	dateloggedin: 'date',
	datecreated: 'date'
};

export const notesModel = {
	title: 'string',
	slug: 'string',
	content: 'string',
	image: 'string',
	position: 'string',
	hidden: 'string',
	datecreated: 'date',
	categories: 'json',
	user: 'string',
	date: 'date'
}

const databases = [
	{ name: 'Pages', model: pageModel },
	{ name: 'Blogs', model: blogModel },
	{ name: 'Expenses', model: expenseModel },
	{ name: 'Notes', model: notesModel },
	{ name: 'Users', model: userModel }
];


export const sessionStore = new ConnectSessionKnexStore({
  knex: knexConstructor({
    client: "sqlite",
    // connection: ":memory:",
    connection: {
      filename: "connect-session-knex.sqlite",
    },
  }),
  cleanupInterval: 0, // disable session cleanup
});

export const connection = knex({
	client: 'sqlite3',
	connection: {
		filename: path.join(process.cwd(), 'database/db.sqlite'),
		ssl: false
	},
	useNullAsDefault: true
});

databases.forEach((database) => {
	connection.schema
		.hasTable(database.name)
		.then((exists) => {
			if (!exists) {
				return connection.schema
					.createTable(database.name, (table: any) => {
						table.increments('id').primary();
						Object.entries(database.model).forEach((key) => {
							const type = key[1];
							const name = key[0];
							table[type](name);
						});
					})
					.then(() => {
						console.log(`Table ${database.name} created`);
					})
					.catch((error) => {
						console.error(`There was an error creating table: ${error}`);
					});
			}
			// Ensure a Promise (or value) is always returned so all code paths are covered
			return Promise.resolve();
		})
		.then(() => {
			console.log(`${database.name} checked`);
		})
		.catch((error) => {
			console.error(`There was an error setting up the database: ${error}`);
		});
});
