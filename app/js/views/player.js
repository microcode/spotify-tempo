PlayerView = SpotifyTempo.View.extend({
    initialize: function (options) {
        this.options = options;
        this.template = Template.get('player');
    },

    onClose: function () {
        this.stop();
        delete this.audio;
    },

    events: {
        "click #prev": "prev",
        "click #play": "play",
        "click #pause": "pause",
        "click #stop": "stop",
        "click #next": "next"
    },

    render: function () {
        this.$el.html(this.template());
        this.slider = this.$el.find("#range").slider({
            range: true,
            min: 80,
            max: 180,
            values: [80, 180],
            change: _.bind(function (event, ui) {
                this.$el.find("#range-outer :first-child").html(ui.values[0]);
                this.$el.find("#range-outer :last-child").html(ui.values[1]);
                this.tracks.showRange(ui.values[0], ui.values[1]);
            }, this)
        });

        return this;
    },

    setRange: function (min, max) {
        if (this.slider) {
            this.slider.slider("option", "values", [min, max]);
            this.slider.slider("option", "min", min);
            this.slider.slider("option", "max", max);
        }
    },

    setActiveTrack: function (track) {
        this.stop();

        var artists = _.map(track.artists, function (artist) { return artist.name; }).join(", ");

        this.$el.find("#name").html(artists + " - " + track.name);

        this.audio = new Audio();
        this.audio.src = track.preview_url;
        this.audio.addEventListener('loadeddata', _.bind(function () {
            this.audio.play();
        }, this));
        this.audio.addEventListener('play', _.bind(function () {
            this.$el.find("#play > span").removeClass('glyphicon-play').addClass('glyphicon-pause');
        }, this));
        this.audio.addEventListener('pause', _.bind(function () {
            this.$el.find("#play > span").removeClass('glyphicon-pause').addClass('glyphicon-play');
        }, this));
        this.audio.addEventListener('ended', _.bind(function () {
            this.tracks.playRandomTrack();
        }, this));
    },

    play: function () {
        if (this.audio) {
            if (this.audio.paused) {
                this.audio.play();
            } else {
                this.audio.pause();
            }
        }
    },

    stop: function () {
        if (this.audio) {
            this.audio.pause();
            delete this.audio;
        }
    },

    next: function () {
        this.tracks.playRandomTrack();
    }
});
