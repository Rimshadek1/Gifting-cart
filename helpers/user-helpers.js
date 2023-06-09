

var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { response } = require('express')
const ObjectId = require('mongodb').ObjectId;
const Razorpay = require('razorpay');

var instance = new Razorpay({
    key_id: 'rzp_test_M51y7iP7UUb0oz',
    key_secret: 'uht2EeQJ24VIDauAEFkVFFqt',
});


module.exports = {
    doSignUp: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.user_collection).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })
        })

    },

    doLogin: async (userData) => {
        if (!userData.Email) {
            throw new Error('Email is required');
        }

        try {
            const user = await db.get().collection(collection.user_collection).findOne({ Email: userData.Email });

            if (user) {
                const match = await bcrypt.compare(userData.Password, user.Password);
                if (match) {
                    console.log('login');
                    return {
                        user: user,
                        status: true
                    };
                } else {
                    console.log('not login');
                    return {
                        status: false
                    };
                }
            } else {
                console.log('not login');
                return {
                    status: false
                };
            }
        } catch (error) {
            console.log('catch catch');
            throw error;
        }
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: new ObjectId(proId),
            quantity: 1,

        }
        return new Promise(async (resolve, reject) => {
            try {
                const userCart = await db.get().collection(collection.cart_collection).findOne({ user: new ObjectId(userId) });
                if (userCart) {
                    let proExist = userCart.products.findIndex(product => product.item == proId)
                    if (proExist != -1) {
                        db.get().collection(collection.cart_collection)
                            .updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
                                {
                                    $inc: { 'products.$.quantity': 1 },

                                }).then(() => {
                                    resolve()
                                })
                    } else {


                        // If user's cart already exists, add the new product id to the existing array
                        db.get().collection(collection.cart_collection).updateOne(
                            { user: new ObjectId(userId) },
                            { $push: { products: proObj } }
                        ).then(() => {
                            resolve();
                        });
                    }
                } else {
                    // If user's cart doesn't exist, create a new cart object with a single array for products
                    const cartObj = {
                        user: new ObjectId(userId),
                        products: [proObj]
                    };
                    db.get().collection(collection.cart_collection).insertOne(cartObj).then(() => {
                        resolve();
                    });
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    ,
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.cart_collection).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                }, {
                    $unwind: '$products'
                }, {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'products.item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }, {
                    $addFields: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }, {
                    $addFields: {
                        'product.price': { $toInt: '$product.price' },
                        'product.item_available': { $toInt: '$product.item_available' }
                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: 1
                    }
                }
            ]).toArray();

            resolve(cartItems);
        });
    }


    ,

    getCartCount: (userId) => {
        let count = 0
        return new Promise(async (resolve, reject) => {
            console.log('hello');
            let cart = await db.get().collection(collection.cart_collection).findOne({ user: new ObjectId(userId) })
            if (cart) {
                count = cart.products.length
                console.log('hello');
                console.log(count);
            }
            resolve(count)
        })
    },


    changeproductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        console.log('count:', details.count, 'quantity:', details.quantity)
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.product_collection)
                .findOne({ _id: new ObjectId(details.product) })
            if (product) {
                let availableQuantity = product.item_available
                let cartUpdate = {}
                if (details.count == -1 && details.quantity == 1) {
                    resolve({
                        removeProduct: true
                    })
                    // Remove product from cart
                    cartUpdate = {
                        $pull: { products: { item: new ObjectId(details.product) } }
                    }


                }
                else {
                    // Update product quantity in cart
                    let newQuantity = details.quantity + details.count
                    let productDetails = await db.get().collection(collection.product_collection)
                        .findOne({ _id: new ObjectId(details.product) }, { item_available: 1, item_quantity: 1 })
                    if (productDetails && newQuantity > productDetails.item_available) {
                        // Don't update cart if new quantity is greater than available quantity
                        resolve({

                            status: false, message: "Cannot add more than available quantity",
                            availableQuantity: productDetails.item_available
                        })
                        return
                    }
                    cartUpdate = {
                        $inc: { 'products.$.quantity': details.count }
                    }
                }
                db.get().collection(collection.cart_collection)
                    .updateOne({
                        _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product)
                    },
                        cartUpdate
                    ).then((response) => {
                        console.log('response:', response)
                        resolve({ status: true })
                    })

            } else {
                resolve({ status: false, message: "Product not found" })
            }
        })
    }





    // if (details.count == -1 && details.quantity == 1) {
    //     // Remove product from cart
    //     cartUpdate = {
    //         $pull: { products: { item: new ObjectId(details.product) } }
    //     }
    // }


    // if (details.count == -1 && details.quantity == 1) {
    //     // Remove product from cart
    //     if (product.item_quantity == 1) {
    //         // If product quantity is already 1, show a message
    //         resolve({
    //             status: false, message: "Minimum number of products is 1",
    //             availableQuantity: product.item_available
    //         })
    //         return
    //     }
    //     cartUpdate = {
    //         $pull: { products: { item: new ObjectId(details.product) } }
    //     }
    // }






    // changeproductQuantity: (details) => {
    //     details.count = parseInt(details.count)
    //     details.quantity = parseInt(details.quantity)
    //     return new Promise(async (resolve, reject) => {
    //             if(details.count == -1 && details.quantity == 1) {
    //     db.get().collection(collection.cart_collection)
    //         .updateOne({
    //             _id: new ObjectId(details.cart)
    //         }, {
    //             $pull: { products: { item: new ObjectId(details.product) } }
    //         }).then((response) => {
    //             resolve({ removeProduct: true })
    //         })
    // } else {
    //             db.get().collection(collection.cart_collection)
    //                 .updateOne({
    //                     _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product)
    //                 },
    //                     {
    //                         $inc: { 'products.$.quantity': details.count }
    //                     }).then((response) => {
    //                         resolve({ status: true })
    //                     })
    //         }
    //     })
    // }


    ,
    deleteCart: (details) => {

        console.log('details.cart');
        console.log(details.cart);
        console.log('details.product');
        console.log(details.product);
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.cart_collection)
                .updateOne({
                    _id: new ObjectId(details.cart)
                }, {
                    $pull: { products: { item: new ObjectId(details.product) } }
                }).then((response) => {
                    resolve({ removeProduct: true })
                })
        })
    },

    totalPrice: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.cart_collection).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                }, {
                    $unwind: '$products'
                }, {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'products.item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }, {
                    $addFields: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }, {
                    $addFields: {
                        'product.price': { $toInt: '$product.price' }
                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: 1
                    }
                }, {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                    }
                }
            ]).toArray();
            if (total.length > 0) {
                resolve(total[0].total);
            } else {
                resolve(0);
            }

        });

    },

    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, total);
            let status = order['Payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: order.Mobile,
                    address: order.Adress,
                    pincode: order['Pin Code']
                },
                userId: new ObjectId(order.userId),
                paymentMethod: order['Payment-method'],
                products: products,
                totalPrice: total,
                date: new Date(),
                status: status
            }
            db.get().collection(collection.order_collection).insertOne(orderObj).then((response) => {
                console.log(response); // Log the inserted order details
                db.get().collection(collection.cart_collection).deleteOne({ user: new ObjectId(order.userId) })
                resolve(response.insertedId)
            })
            // Assume that `products` is an array of objects representing the products to be updated
            const productUpdates = products.map((product) => ({
                updateOne: {
                    filter: { _id: new ObjectId(product.item), item_available: { $gte: product.quantity } },
                    update: { $inc: { item_available: -product.quantity } },
                },
            }));

            db.get().collection(collection.product_collection).bulkWrite(productUpdates)
                .then((result) => {
                    console.log(result); // check the result of the bulk write operation
                })
                .catch((error) => {
                    console.log(error); // log any errors thrown by the bulk write operation
                });













            // db.get().collection(collection.product_collection).findOneAndUpdate(
            //     { _id: new ObjectId(products[0].item), item_available: { $gt: 0 } },
            //     { $inc: { item_available: -1 } }
            // )
            //     .then((result) => {
            //         console.log(result); // check the result of the update operation
            //     })
            //     .catch((error) => {
            //         console.log(error); // log any errors thrown by the update operation
            //     });



        })
    },

    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.cart_collection).findOne({ user: new ObjectId(userId) })
            console.log('cartt' + cart);
            console.log('cartt' + cart.products);
            resolve(cart.products)
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.order_collection)
                .find({ userId: new ObjectId(userId) }).toArray()
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.order_collection).aggregate([
                {
                    $match: { _id: new ObjectId(orderId) }
                }, {
                    $unwind: '$products'
                }, {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'products.item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }, {
                    $addFields: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }, {
                    $addFields: {
                        'product.price': { $toInt: '$product.price' }
                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: 1
                    }
                }
            ]).toArray();
            console.log('orderItems:', orderItems);
            resolve(orderItems);
        });
    },
    genetrateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: '' + orderId
            };
            instance.orders.create(options, function (err, order) {
                console.log('new order' + order);
                resolve(order)
            });
        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'uht2EeQJ24VIDauAEFkVFFqt')
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.order_collection).updateOne({ _id: new ObjectId(orderId) },
                {
                    $set: {
                        status: 'placed'
                    }
                }
            ).then(() => {
                resolve()
            })
        })
    }

}