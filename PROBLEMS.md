# Problems with implementation

- If there are no entries in the join set, agg_list will collect it to a null which will result into lack of attribute
- No indices, also can't use metadata as source of indices because it can be applied to a view reference
- StaleRO for async indices
- streaming query can be used but currently blocked by both http streaming response of the function and async indices
- In the invidiual query per entity apporach there is on way to limit the right side