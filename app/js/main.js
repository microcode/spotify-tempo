var app = new (SpotifyTempo.Router.extend({
    initialize: function () {
    },

    routes: {
        "": "showRoot"
    },

    showRoot: function () {
        this.showView("#body", new RootView());
    }
}));

async.parallel([
    Template.preload
], function (err) {
    if (!Backbone.History.started) {
        Backbone.history.start();
    }
});

