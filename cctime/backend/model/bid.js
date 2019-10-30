module.exports = {
  name: 'bids',
  fields: [
    {
      name: 'id',
      type: 'String',
      length: '20',
      not_null: true,
      primary_key: true
    },
    {
      name: 'tid',
      type: 'String',
      length: 64,
      not_null: true,
      unique: true
    },
    {
      name: 'vid',
      type: 'String',
      length: 20,
      not_null: true,
      index: true
    },
    {
      name: 'aid',
      type: 'String',
      length: 20,
      not_null: true,
      index: true
    },
    {
      name: 'voterId',
      type: 'String',
      length: 50,
      not_null: true,
      index: true
    },
    {
      name: 'timestamp',
      type: 'Number',
      not_null: true
    },
    {
      name: 'amount',
      type: 'String',
      length: 50,
      not_null: true
    }
  ]
}
