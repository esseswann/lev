-- import connection.sql

declare $input as Struct<
  from: Optional<Datetime>,
  to:  Optional<Datetime>,
  limit: Optional<Uint64>
>;

declare $kek as Optional<List<Struct< test: Utf8, plest: Utf8 >>>;declare $role as Utf8;

$role = 'role';