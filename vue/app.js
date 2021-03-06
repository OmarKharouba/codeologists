import './bootstrap';

import router from './routes';

import calender from './components/calender.vue';
import dayDetails from './views/dayDetails';
import reserveTime from './views/reserveTime.vue';
Vue.component('calender', calender);
Vue.component('dayDetails', dayDetails);
Vue.component('reservetime',reserveTime);
import calender2 from './components/calender2.vue';
import dayDetails2 from './views/dayDetails2';
import reserveTime2 from './views/reserveTime2.vue';
Vue.component('calender2', calender2);
Vue.component('dayDetails2', dayDetails2);
Vue.component('reservetime2',reserveTime2);

window.Event = new Vue();

class Errors {

    constructor() {
        this.errors = {};
    }

    has(field) {
        return this.errors.hasOwnProperty(field);
    }

    any() {
        return Object.keys(this.errors).length > 0;
    }

    get(field) {
        if (this.errors[field]) {
            return this.errors[field];
        }
    }

    record(errors) {
        this.errors = errors;
    }

    clear(field) {
        if (field) {
            delete this.errors[field];

            return;
        }

        this.errors = {};
    }
}


window.Form = class Form {

    constructor(data) {
        this.originalData = data;

        for (let field in data) {
            this[field] = data[field];
        }

        this.errors = new Errors();
    }

    data() {
        let data = {};

        for (let property in this.originalData) {
            data[property] = this[property];
        }

        return data;
    }

    reset() {
        for (let field in this.originalData) {
            this[field] = '';
        }

        this.errors.clear();
    }

    submit(requestType, url) {
        return new Promise((resolve, reject) => {
            axios[requestType](url, querystring.stringify(this.data()), { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
                .then(response => {
                    this.onSuccess(response.data);

                    resolve(response.data);
                })
                .catch(error => {
                    this.onFail(error.response.data);

                    reject(error.response.data);
                });
        });
    }

    onSuccess(data) {

        this.reset();
    }

    onFail(errors) {
        var errs = [];
        for (var i = 0; i < errors.length; i++) {
            var e = errors[i];
            var param = e.param;
            errs[e.param] = e.msg;
        }
        this.errors.record(errs);
    }
}


new Vue({

    el: '#app',

    router,

    data:{
        showLogin:false
    },
    computed:{
        user:function(){return this.$session.get('user');},
        type: function () {
            return this.$session.get('type');
        }
    },
    mounted(){
        window.user=false;
        window.type='visitor';
        Event.$on('loggedIn', data => {
            this.$session.start();
            this.$session.set('user',data.user);
            this.$session.set('type',data.type);
            // this.user = data.user;
            // this.type = data.type;
            location.reload();
            this.showLogin = false;
        })
    },

    methods:{
        logout(){
            axios.get('/logout').then(res =>{
                // this.user = false;
                // this.type = 'visitor';
                this.$session.destroy();
                location.reload();
                this.$router.push('/');
            }).catch(err => {
                console.log(err);
            });
        },

        backHome(){
            this.showLogin=false;
            this.$router.push('/');
        },


        redirect() {

               //router.replace('/dayDetail/-1');

        },
    },
    created(){
        Event.$on('calendercreated', () => this.redirect());
        Event.$on('calendercreated2', () => this.redirect());
    },
    components: {reserveTime,calender2, dayDetails2,reserveTime2 }

});
