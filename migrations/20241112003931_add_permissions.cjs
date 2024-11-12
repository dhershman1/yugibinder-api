/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex('permissions').insert([
    { permission_name: 'add:card' },
    { permission_name: 'delete:card' },
    { permission_name: 'edit:card' },
    { permission_name: 'view:card' },
    { permission_name: 'view:binder' },
    { permission_name: 'add:binder' },
    { permission_name: 'delete:binder' },
    { permission_name: 'edit:binder' },
    { permission_name: 'view:user' },
    { permission_name: 'add:user' },
    { permission_name: 'delete:user' },
    { permission_name: 'edit:user' },
    { permission_name: 'add:tag' },
    { permission_name: 'delete:tag' },
    { permission_name: 'edit:tag' },
    { permission_name: 'write:articles' },
    { permission_name: 'delete:articles' },
    { permission_name: 'edit:articles' },
    { permission_name: 'view:articles' },
    { permission_name: 'add:comment' },
    { permission_name: 'delete:comment' },
    { permission_name: 'edit:comment' },
    { permission_name: 'add:role' },
    { permission_name: 'delete:role' },
    { permission_name: 'edit:role' },
    { permission_name: 'add:permission' },
    { permission_name: 'delete:permission' },
    { permission_name: 'edit:permission' },
    { permission_name: 'edit:other:binders' },
    { permission_name: 'delete:other:binders' },
    { permission_name: 'edit:other:users' },
    { permission_name: 'delete:other:users' },
    { permission_name: 'edit:other:articles' },
    { permission_name: 'delete:other:articles' },
    { permission_name: 'edit:other:comments' },
    { permission_name: 'delete:other:comments' }
  ])
    .onConflict('permission_name')
    .ignore()
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex('permissions').del()
}
