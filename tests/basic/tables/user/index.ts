import { Column, TableDescription, Types } from 'ydb-sdk'

const table = new TableDescription()
  .withColumn(new Column('id', Types.UINT64))
  .withColumn(new Column('name', Types.UTF8))
  .withPrimaryKey('id')

export default table
