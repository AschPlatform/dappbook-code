module.exports = {
  name: 'articles',
  fields: [{
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
      name: 'authorId',
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
      name: 'title',
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
      name: 'text',
      type: 'String',
      length: 4096,
      not_null: true
    },
    {
      name: 'tags',
      type: 'String',
      length: 20
    },
    {
      name: 'votes',
      type: 'Number',
      not_null: true,
      default: 0
    },
    {
      name: 'comments',
      type: 'Number',
      not_null: true,
      default: 0
    },
    {
      name: 'reports',
      type: 'Number',
      not_null: true,
      default: 0
    },
    {
      name: 'cid',
      type: 'String',
      length: '20',
      not_null: true,
      index: true
    },
    {
      name: 'settleTimestamp',
      type: 'Number',
      not_null: true
    },
    {
      name: 'awardType',
      type: 'Number',
      not_null: true,
      default: 0
    },
    {
      name: 'awardState',
      type: 'Number',
      not_null: true,
      default: -1
    }
  ]
}