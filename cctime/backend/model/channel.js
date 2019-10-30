module.exports = {
  name: 'channels',
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
      name: 'creatorId',
      type: 'String',
      length: 50,
      not_null: true,
      index: true
    },
    {
      name: 'timestamp',
      type: 'Number',
      not_null: true,
    },
    {
      name: 'name',
      type: 'String',
      length: 256,
      not_null: true
    },
    {
      name: 'url',
      type: 'String',
      length: 256
    },
    {
      name: 'desc',
      type: 'String',
      length: 1024,
      not_null: true
    },
    {
      name: 'reports',
      type: 'Number',
      not_null: true,
      default: 0
    },
    {
      // article number
      name: 'articles',
      type: 'Number',
      not_null: true,
      default: 0
    },
    {
      // vote number
      name: 'votes',
      type: 'Number',
      not_null: true,
      default: 0
    }
  ]
}
