<template>
    <div class="w3-container" v-if="type=='ServiceProvider'">
        <button class="button is-primary w3-margin-right" v-for="arena in arenas" @click="selectArena(arena.name)">{{arena.name}}</button>

        <br>
        <br>
        
        <table class="table is-striped">
          <thead>
            <th>Arena</th>
            <th>Date</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Player Name</th>
            <th>&nbsp</th>
            <th>&nbsp</th>
          </thead>
          <tbody>
            <tr v-for="(booking , index) in bookings">
              <td>{{booking.arena}}</td>
              <td>{{booking.bookDay}}/{{booking.bookMonth+1}}/{{(new Date()).getFullYear()}}</td>
              <td>{{hour(booking.start_index)}}:{{minute(booking.start_index)}}</td>
              <td>{{hour(booking.end_index+1)}}:{{minute(booking.end_index+1)}}</td>
              <td>{{players[index]}}</td>
              <td><button class="button w3-green" type="button" @click="accept(booking)">Accept</button></td>
              <td><button class="button w3-red" type="button" @click="reject(booking)">Reject</button></td>
              
            </tr>
          </tbody>
        </table>


    </div>
</template>

<script>
    var async = require("async");
    export default ({
        data() {
            return {
                bookings: [],
                arenas: [],
                curArena :'',
                players : []
            }
        },
        created() {
            axios.get('/getArenas').then(res => this.arenas = (res.data)).catch(err => console.log(err));
        },
        methods: {
            hour(index) {
              var x = '';
                if(Math.floor(index)/2 <10)
                  x+='0';
                return x+Math.floor(index / 2);
            },
            minute(index) {
                return (index % 2) == 0 ? '00' : '30';
            },

            selectArena(arenaName) {
              this.players = [];
              this.curArena = arenaName;
                axios.get('/arena/' + arenaName + '/viewBookings')
                    .then((res) => {
                        console.log(res);
                        this.bookings = res.data.bookings;
                        this.players = res.data.players;
                        this.curArena = arenaName;
                        this.players = [];
                        for (var i = 0; i < this.bookings.length; i++) {
                          console.log(i);
                              let playerID = this.bookings[i].player;
                              axios.get('/getNameOfPlayer/' + playerID)
                              .then(res => {this.players.push(res.data.player.name);})
                              .catch(err => console.log(err));
                        }
                    })
                    .catch(err => this.Bookings = []);

            },

            accept(booking) {
                if (confirm('Are you sure you want to accept this booking? If you accepted it, It will reject all conflicting bookings')) {
                    axios.post('/acceptBooking/' + booking._id, querystring.stringify({ arena: booking.arena }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
                        .then(response => {
                            if (response.error) {
                                this.$notify.error({
                                  title: 'Error',
                                  message: response.error
                                });
                            }
                            else {
                                this.$notify({
                                  title: 'Done',
                                  message: 'You have successfully accepted the booking',
                                  type: 'success'
                                });
                                this.selectArena(this.curArena);
                            }
                        })
                        .catch(err => {
                            this.$notify.error({
                                  title: 'Error',
                                  message: err,
                                });
                        });
                }
            },

            reject(booking) {
                if (confirm('Are you sure you want to reject this booking?')) {
                    axios.post('/rejectBooking/' + booking._id, querystring.stringify({ arena: booking.arena }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
                        .then(response => {
                            if (response.error) {
                                this.$notify.error({
                                  title: 'Error',
                                  message: response.error
                                });
                            }
                            else {
                                this.$notify({
                                  title: 'Done',
                                  message: 'You have successfully rejected the booking',
                                  type: 'success'
                                });
                                this.selectArena(this.curArena);
                            }
                        })
                        .catch(err => {
                            this.$notify.error({
                                  title: 'Error',
                                  message: err
                                });
                        });
                }
            }

        },

        computed: {
            user: function () { return this.$session.get('user'); },
            type: function () { return this.$session.get('type'); }
        }
    })

</script>