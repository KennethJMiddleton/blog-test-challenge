'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
    console.info('seeding blog data');
    const seedData = [];
  
    for (let i=1; i<=10; i++) {
      seedData.push(generateBlogData());
    }
    return BlogPost.insertMany(seedData);
}


function generateBlogData() {
  return {
    author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
    },
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraph(),
    created: faker.date.recent()
  };
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blogs API Resource', function(){
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });
    
    beforeEach(function() {
        return seedBlogData();
    });
    
    afterEach(function() {
        return tearDownDb();
    });
    
    after(function() {
        return closeServer();
    });

    describe('GET Endpoint', function(){
        it('should return all existing posts', function() {
            let res;
            return chai.request(app)
            .get('/posts')
            .then(function(_res){
                res = _res;
                //console.log(res.body);
                expect(res).to.have.status(200);
                expect(res.body).to.have.lengthOf.at.least(1);
                return BlogPost.count();
            })
            .then(function(count) {
                expect(res.body).to.have.lengthOf(count);
            });
        });

        it('should return blogs with right fields', function(){
            let resBlog;
            return chai.request(app)
            .get('/posts')
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.a('array');
                expect(res.body).to.have.length.of.at.least(1);
                res.body.forEach(function(post) {
                    expect(post).to.be.a('object');
                    expect(post).to.include.keys('id', 'author', 'title', 'content', 'created');
                });
                resBlog = res.body[0];
                return BlogPost.findById(resBlog.id);
            })
            .then(function(post){
                console.log(resBlog);
                expect(resBlog.id).to.equal(post.id);
                expect(resBlog.author).to.equal(post.author.firstName + " " + post.author.lastName);
                expect(resBlog.title).to.equal(post.title);
                expect(resBlog.content).to.equal(post.content);
            });
        });
    });

    describe('POST endpoint', function() {
        it('should add a new blog', function() {
            const newBlog = generateBlogData(); 
            return chai.request(app)
            .post('/posts')
            .send(newBlog)
            .then(function(res){
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.a('object');
                expect(res.body).to.include.keys('id', 'author', 'title', 'content', 'created');
                expect(res.body.id).to.not.be.null
                return BlogPost.findById(res.body.id);
            })
            .then(function (post){
                expect(post.author.firstName).to.equal(newBlog.author.firstName);
                expect(post.author.lastName).to.equal(newBlog.author.lastName);
                expect(post.title).to.equal(newBlog.title);
                expect(post.content).to.equal(newBlog.content);
            });
        });
    });

    describe('PUT endpoint', function() {
        it('should update fields you send over', function() {
            const updateData = {
                title: 'foo',
                content: 'bar'
            };

            return BlogPost
            .findOne()
            .then(function(post){
                updateData.id = post.id;
                return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
            })
            .then(function(res){
                expect(res).to.have.status(204);
                return BlogPost.findById(updateData.id);
            })
            .then(function(post){
                expect(post.title).to.equal(updateData.title);
                expect(post.content).to.equal(updateData.content);
            });
        });
    });

    describe('DELETE endpoint', function() {
        it('should delete a post by id', function(){
            let post;
            return BlogPost
            .findOne()
            .then(function(_post){
                post = _post;
                return chai.request(app).delete(`/posts/${post.id}`);
            })
            .then(function(res){
                expect(res).to.have.status(204);
                return BlogPost.findById(post.id);
            })
            .then(function(_post){
                expect(_post).to.be.null;
            });
        });    
    });
});