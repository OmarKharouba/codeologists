var Vue = require('vue');
var axios = require('axios');
window.Vue = Vue;
window.axios = axios;
window.Event = new Vue();
window.querystring = require('querystring');
import vueRouter from 'vue-router';
import router from './router.js'
import booking from './components/booking.vue';
import day from './components/day.vue';
import calender from './components/calender.vue';
import calenderHeader from './components/calenderHeader.vue';
import month from './components/month.vue';
import dayDetails from './views/dayDetails';
import reserveTime from './views/reserveTime.vue';
Vue.component('calender', calender);
Vue.component('dayDetails', dayDetails);
Vue.component('reservetime',reserveTime);
Vue.use(vueRouter);
//handle errors
var viewBookings = new Vue({
    el: "#viewBookingsRoot",
    data: {
        //remove hard coded bookings
        Bookings: [],
        myArenas: [],
    },
    components: { 'booking': booking },
    created() {
        this.getArenas();

    },
    methods: {
        selectArena: function (arenaName) {
            //Service provider slects an arena to view pending bookings in that arena
            axios.get('/arena/' + arenaName + '/viewBookings').then((res) => this.Bookings = res.data).catch(err => this.Bookings = []);//if not logged in redirect to log in page



        },
        getArenas: function () {
            axios.get('/getArenas').then(res => this.myArenas = (res.data)).catch(err => console.log(err));

        },

    }


});

var bookHours = new Vue({
    el: "#schedlueRoot",
    components: { calender, dayDetails,reserveTime },
    router: router,
    methods: {
        redirect(data) {
            
           //if(data.month == (new Date().getMonth()))
             if(false)   
                router.replace('/dayDetail/' + data.day);
            else
               router.replace('/dayDetail/22');
           
        },
        onshowfirstmonth(){
                window.alert('hello there');
            }
    },
    data: {



    },
    created() {
        Event.$on('calendercreated', (data) => this.redirect(data));
        //Event.$on('showfirstmonth',() => Event.$emit('goback'));
    }
})

