var db = require('../config/connection')
var collection = require('../config/collection')
const { response } = require('express')
var ObjectId = require('mongodb').ObjectId
module.exports = {
    doLogin: async (adminData) => {
        if (!adminData.Email) {
            throw new Error('Email is required');
        }

        try {
            const admin = await db.get().collection(collection.user_collection).findOne({ Email: adminData.Email });

            if (admin) {
                const match = await bcrypt.compare(adminData.Password, admin.Password);
                if (match) {
                    console.log('loginAdmin');
                    return {
                        admin: admin,
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
    }



    ,
    addProduct: (product, callback) => {
        product.item_available = parseInt(product.item_available);
        product.price = parseInt(product.price);
        console.log(product.category)
        db.get().collection('product').insertOne(product).then((data) => {
            console.log(data);
            callback(data.insertedId);
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.product_collection).find().toArray();
            resolve(products);
        });
    }, getTrending: () => {

        return new Promise(async (resolve, reject) => {
            let trending = await db.get().collection(collection.product_collection).find({ category: 'trending' }).sort({ datetime: -1 }).toArray();
            resolve(trending);
        });
    },
    getbirthday: () => {
        return new Promise(async (resolve, reject) => {
            let birthday = await db.get().collection(collection.product_collection).find({ category: 'birthday' }).toArray();
            resolve(birthday);
        });
    },
    getflowers: () => {
        return new Promise(async (resolve, reject) => {
            let flowers = await db.get().collection(collection.product_collection).find({ category: 'flowers' }).toArray();
            resolve(flowers);
        });
    },
    getcakes: () => {
        return new Promise(async (resolve, reject) => {
            let cakes = await db.get().collection(collection.product_collection).find({ category: 'cakes' }).toArray();
            resolve(cakes);
        });
    },

    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            console.log(proId);
            console.log(new ObjectId(proId)); // Add `new` here
            db.get().collection(collection.product_collection).deleteOne({ _id: new ObjectId(proId) })
                .then((response) => {
                    resolve(response);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.product_collection).findOne({ _id: new ObjectId(proId) }).then((product) => {
                resolve(product)
            })

        })

    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.product_collection).updateOne({ _id: new ObjectId(proId) }, {
                $set: {
                    Name: proDetails.Name,
                    category: proDetails.category,
                    price: proDetails.price,
                    Description: proDetails.Description

                }
            }).then((response) => {
                resolve()
            })

        })
    }











    // deleteProduct: (proId) => {
    //     return new Promise((resolve, reject) => {
    //         console.log(proId)
    //         console.log(ObjectId(proId))
    //         db.get().collection(collection.product_collection).removeOne({ _id: ObjectId(proId) }).then((response) => {

    //             resolve(response)
    //         })
    //     })
    // }

}


