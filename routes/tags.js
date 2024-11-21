import express from 'express'
import authenticateToken from '../middleware/authenticateToken.js'

const router = express.Router()

router.get('/', authenticateToken, async (req, res) => {
  const tags = await req.db('tags')

  res.json(tags)
})

router.get('/:binderId', async (req, res) => {
  const { binderId } = req.params

  try {
    const tags = await req.db('binder_tags')
      .join('tags', 'binder_tags.tag_id', 'tags.id')
      .select('tags.id', 'tags.title')
      .where('binder_tags.binder_id', binderId)

    res.json(tags)
  } catch (err) {
    req.log.error(err, 'Error fetching tags for binder')
    res.status(500).json({ error: 'Something went wrong fetching tags for binder' })
  }
})

router.post('/:tagId', authenticateToken, async (req, res) => {
  const { binderId } = req.body

  try {
    await req.db('binder_tags').insert({
      binder_id: binderId,
      tag_id: req.params.tagId
    })

    res.json({ message: 'Tag added' })
  } catch (err) {
    req.log.error(err, 'Error adding tag')
    res.status(500).json({ error: 'Something went wrong adding tag' })
  }
})

router.delete('/:tagId', authenticateToken, async (req, res) => {
  const { binderId } = req.body

  try {
    await req.db('binder_tags')
      .where({
        binder_id: binderId,
        tag_id: req.params.tagId
      })
      .del()

    res.json({ message: 'Tag removed' })
  } catch (err) {
    req.log.error(err, 'Error removing tag')
    res.status(500).json({ error: 'Something went wrong removing tag' })
  }
})

export default router
