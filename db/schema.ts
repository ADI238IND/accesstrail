import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const jobs=sqliteTable('research_jobs',{
 id:text('id').primaryKey(),
 venue:text('venue').notNull(),
 providerRunId:text('provider_run_id'),
 status:text('status').notNull(),
 resultJson:text('result_json'),
 createdAt:integer('created_at').notNull(),
 updatedAt:integer('updated_at').notNull(),
 error:text('error')
},t=>[index('jobs_venue_status').on(t.venue,t.status)]);
export const sourceChecks=sqliteTable('source_checks',{
 venue:text('venue').primaryKey(),
 checkedAt:integer('checked_at').notNull(),
 resultJson:text('result_json').notNull()
});
