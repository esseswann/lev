# lev

[Hasura](https://hasura.io/)-like GraphQL to [YDB](https://ydb.tech)-flavored SQL converter for serverless use

## Similarities to Hasura
Like Hasura provides GraphQL interface to a specific SQL database, in this case YDB. Requires a [metadata](src/metadata.ts) description of relationship between the tables and allows for flexible permission rules

## Differences from Hasura
Since YDB does not have views, their implementation is based around named variables like
```sql
$my_table = select *
              from `table` t 
              join `another_table` a
                on a.id = t.a_id
```
Moreover unlike Hasura permissions are also implemented in this way, which is actually more flexible.

## Serverless
The whole reason this library was created is to have a stateless coverter for serverless use. It can be used in a [serverless function](https://cloud.yandex.ru/docs/functions/)

## Status
- [x] Queries
- [ ] Mutations
- [ ] Type-casting for non-primitive types
- [ ] Subscriptions
- [ ] Fragments
- [ ] Unions
- [ ] Interfaces

## Naming
Named after count [Leo Tolstoy](https://tolstoy.ru/), which in Russian reads as `graph Lev Tolstoy`. Yandex's HQ is also located on the [Tolstoy street](https://yandex.ru/maps/org/yandeks/1124715036/?ll=37.587093%2C55.733974&z=16)
