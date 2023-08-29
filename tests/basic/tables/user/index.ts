import { Column, TableDescription, Types } from 'ydb-sdk'

const table = new TableDescription()
  .withColumn(new Column('id', Types.UINT64))
  .withColumn(new Column('longest_run', Types.optional(Types.INTERVAL)))
  .withColumn(new Column('name', Types.optional(Types.UTF8)))
  .withPrimaryKey('id')

export default table
