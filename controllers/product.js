const Product =require("../models/product.js");
const fs =require("fs");
const braintree = require('braintree')
const slugify =require("slugify");
require("dotenv").config();
const Order =require("../models/order.js");
const sendEmail = require("../helpers/sendEmail.js")
// const sgMail =require("@sendgrid/mail");

// sgMail.setApiKey(process.env.SENDGRID_KEY);


const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

exports.create = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;

    // validation
    switch (true) {
      case !name?.trim():
        return res.json({ error: "Name is required" });
      case !description?.trim():
        return res.json({ error: "Description is required" });
      case !price?.trim():
        return res.json({ error: "Price is required" });
      case !category?.trim():
        return res.json({ error: "Category is required" });
      case !quantity?.trim():
        return res.json({ error: "Quantity is required" });
      case !shipping?.trim():
        return res.json({ error: "Shipping is required" });
      case photo && photo.size > 1000000:
        return res.json({ error: "Image should be less than 1mb in size" });
    }

    // create product
    const product = new Product({ ...req.fields, slug: slugify(name) });

    if (photo) {
      product.photo.data = fs.readFileSync(photo.path);
      product.photo.contentType = photo.type;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    console.log(err);
    return res.status(400).json(err.message);
  }
};

exports.list = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate("category")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

/* It retrieves up to 12 documents from the Product collection in the database, sorted in descending order by their createdAt field. The find() method is used to query the collection, and an empty object passed as the argument retrieves all documents in the collection.
The populate() method is called with the argument "category", which tells Mongoose to replace the category field in each product document with the full Category document it references, based on the category field's ObjectId. */

exports.read = async (req, res) => {
  try {
    const product = await Product.findOne({slug: req.params.slug })
      .select("-photo")
      .populate("category");
    res.json(product);
  } catch (err) {
    console.log(err);
  }
};

exports.photo = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select(
      "photo"
    );
    if (product.photo.data) {
      res.set("Content-Type", product.photo.contentType);
      res.set("Cross-Origin-Resource-Policy", "cross-origin")
      return res.send(product.photo.data);
    }
  } catch (err) {
    console.log(err);
  }
};

exports.remove = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(
      req.params.productId
    ).select("-photo");
    res.json(product);
  } catch (err) {
    console.log(err);
  }
};

exports.update = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;

    // validation
    switch (true) {
      case !name?.trim():
      return  res.json({ error: "Name is required" });
      case !description?.trim():
      return  res.json({ error: "Description is required" });
      case !price?.trim():
      return  res.json({ error: "Price is required" });
      case !category?.trim():
      return  res.json({ error: "Category is required" });
      case !quantity?.trim():
      return  res.json({ error: "Quantity is required" });
      case !shipping?.trim():
      return  res.json({ error: "Shipping is required" });
      case photo && photo.size > 1000000:
      return  res.json({ error: "Image should be less than 1mb in size" });
    }

    // update product
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      {
        ...req.fields,
        slug: slugify(name),
      },
      { new: true }
    );

    if (photo) {
      product.photo.data = fs.readFileSync(photo.path);
      product.photo.contentType = photo.type;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    console.log(err);
    return res.status(400).json(err.message);
  }
};

//  ==============Filter Products===========
exports.filteredProducts = async (req, res) => {
  try {
    const { checked, radio } = req.body;
    let args = {};
    if (checked.length > 0) 
    args.category = checked
    if (radio.length) 
    args.price = { $gte: radio[0], $lte: radio[1] };
  
    let  query = {};
    if (Object.keys(args).length > 0) {
      query = args;
    }
    const products = await Product.find(args);
    console.log("filtered products query => ", products.length);
    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

exports.productsCount = async (req, res) => {
  try {
    const total = await Product.find({}).estimatedDocumentCount();
    res.json(total);
  } catch (err) {
    console.log(err);
  }
};

exports.listProducts = async (req, res) => {
  try {
    const perPage = 2;
    const page = req.params.page ? req.params.page : 1;

    const products = await Product.find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

exports.productsSearch = async (req, res) => {
  try {
    const { keyword } = req.params;
    const results = await Product.find({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } }        
      ],
    }).select("-photo");

    res.json(results);
  } catch (err) {
    console.log(err);
  }
};

exports.relatedProducts = async (req, res) => {
  try {
    const { productId, categoryId } = req.params;
    
    const related = await Product.find({
      category: categoryId,
      _id: { $ne: productId },
    })
      .select("-photo")
      .populate("category")
      .limit(3);

    res.json(related);
  } catch (err) {
    console.log(err);
  }
};

// ==============Payment getway==========

exports.getToken = async (req, res) => {
  try {
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(response);
      }
    });
  } catch (err) {
    console.log(err);
  }
};

// ==========Process Payment=========

exports.processPayment = async (req, res) => {
  try {
    // console.log(req.body);
    const { nonce, cart } = req.body;
    let total = 0;
    cart.map((i) => {
      total += i.price;
    });
    // console.log("total => ", total);

    let newTransaction = gateway.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },

      // gateway.transaction.sale(): this is a method provided by the Braintree Payments gateway that is used to initiate a new transaction. 
      function (error, result) {
        if (result) {
          // res.send(result);
          // create order
          const order = new Order({
            products: cart,
            payment: result,
            buyer: req.user._id,
          }).save();
          // decrement quantity
          decrementQuantity(cart);
          // const bulkOps = cart.map((item) => {
          //   return {
          //     updateOne: {
          //       filter: { _id: item._id },
          //       update: { $inc: { quantity: -0, sold: +1 } },
          //     },
          //   };
          // });

          // Product.bulkWrite(bulkOps, {});
          res.json({ ok: true });
        } else {
          res.status(500).send(error);
        }
      }
    );
  } catch (err) {
    console.log(err);
  }
};

const decrementQuantity = async (cart) => {
  try {
    // build mongodb query
    const bulkOps = cart.map((item) => {
      return {
        updateOne: {
          filter: { _id: item._id },
          update: { $inc: { quantity: -0, sold: +1 } },
        },
      };
    });

    const updated = await Product.bulkWrite(bulkOps, {});
    console.log("blk updated", updated);
  } catch (err) {
    console.log(err);
  }
};

// ================implementation of sendgrid========

exports.orderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // orginally order not processed 
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate("buyer", "email name");
    // send email
    const message = `
    <h1>Hi ${order.buyer.name}, Your order's status is: <span style="color:red;">${order.status}</span></h1>
    <p>Visit <a href="${process.env.CLIENT_URL}/dashboard/user/orders">your dashboard</a> for more details</p>
  `;
  const subject = "Order status";
  const send_to = order.buyer.email;
  const sent_from = process.env.EMAIL_USER;

   try{
    await sendEmail(subject, message, send_to, sent_from);
    res.status(200).json({success:true, message: "Confirm email sent"});
   } catch(err){
   res.status(500);
      throw new Error("Emai not sent, please try again");
   }
   res.json(order);

  } catch (err) {
    console.log(err);
  }
};
