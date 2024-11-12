/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex('roles').insert([
    { role_name: 'superadmin', permissions: [] },
    {
      role_name: 'admin',
      permissions: [
        'delete:other:binders',
        'delete:other:articles',
        'edit:other:binders',
        'edit:other:articles',
        'edit:other:comments',
        'delete:other:comments',
        'view:articles',
        'write:articles',
        'edit:articles',
        'view:card',
        'add:comment',
        'delete:comment',
        'edit:comment',
        'view:binder',
        'edit:binder',
        'add:binder',
        'delete:binder',
        'view:user',
        'edit:user',
        'delete:user'
      ]
    },
    {
      role_name: 'writer',
      permissions: [
        'view:articles',
        'write:articles',
        'edit:articles',
        'view:card',
        'add:comment',
        'delete:comment',
        'edit:comment',
        'view:binder',
        'edit:binder',
        'add:binder',
        'delete:binder',
        'view:user',
        'edit:user',
        'delete:user'
      ]
    },
    {
      role_name: 'user',
      permissions: [
        'view:card',
        'view:articles',
        'add:comment',
        'delete:comment',
        'edit:comment',
        'view:binder',
        'edit:binder',
        'add:binder',
        'delete:binder',
        'view:user',
        'edit:user',
        'delete:user'
      ]
    },
    {
      role_name: 'banned',
      permissions: [
        'view:articles',
        'view:binder',
        'view:card',
        'view:user'
      ]
    }
  ])
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex('roles').del()
}
