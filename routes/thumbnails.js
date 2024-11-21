import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const thumbnails = (await req.db('binder_images').select('id', 's3_key', 'artist')).map((thumbnail) => {
      thumbnail.url = `https://imgs.yugibinder.com/binders/${thumbnail.s3_key}`
      return thumbnail
    })

    res.json(thumbnails)
  } catch (err) {
    req.log.error(err, 'Error fetching binder thumbnails')
    res.status(500).json({ error: 'Something went wrong fetching binder thumbnails' })
  }
})

export default router
