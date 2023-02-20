const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

  router.get('/', async (req, res) => {
    try{
      const productData = await Product.findAll({
        include: [{ model: Category, Tag}],
      });
      res.status(200).json(productData);
    } catch (err) {
      res.status(500).json(err);
    }
  });

router.get('/:id', async (req, res) => {
  try{
    const productData = await Product.findByPk(req.params.id, {
      include: [{ model: Category, Tag}],
    });

    if(!productData){
      res.status(404).json({message: 'No Product Found With That ID'});
      return;
    }

    res.status(200).json(productData);
  } catch (err) {
    res.status(500).json(err);
  }
});

// create new product
router.post('/', (req, res) => {
  Product.create(req.body)
    .then((product) => {
      if (req.body.tagIds.length) {
        const productTagIdArr = req.body.tagIds.map((tag_id) => {
          return {
            product_id: product.id,
            tag_id,
          };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      }
      res.status(200).json(product);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// update product
router.put('/:id', (req, res) => {
  // update product data
  Product.update(req.body, {
    where: {
      product_id: req.params.id,
    },
  })
    .then((product) => {
      // find all associated tags from ProductTag
      return ProductTag.findAll({ where: { product_id: req.params.id } });
    })
    .then((productTags) => {
      // get list of current tag_ids
      const productTagIds = productTags.map(({ tag_id }) => tag_id);
      // create filtered list of new tag_ids
      const newProductTags = req.body.tagIds
        .filter((tag_id) => !productTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
        .map(({ product_id }) => product_id);

      // run both actions
      return Promise.all([
        ProductTag.destroy({ where: { product_id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags),
      ]);
    })
    .then((updatedProductTags) => res.json(updatedProductTags))
    .catch((err) => {
      // console.log(err);
      res.status(400).json(err);
    });
});

router.delete('/:id', async (req, res) => {
  try {
    const trashProduct = await Product.destroy({
      where: {
        product_id: req.params.id
      }
    });
    if (trashProduct === 0) {
      return res.status(404).json({ message: 'Unknown Product' });
    }
    res.status(200).json({ message: 'Product deleted!' });
  } catch (err) {
    res.status(400).json(err);
  }
});

module.exports = router;