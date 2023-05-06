# Problems with implementation

- If there are no entries in the join set, agg_list will collect it to a null which will result into lack of attribute
- No indices, also can't use metadata as source of indices because it can be applied to a view reference