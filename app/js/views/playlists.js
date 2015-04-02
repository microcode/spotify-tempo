PlaylistView = SpotifyTempo.View.extend({
    initialize: function (options) {
        this.spotify = options.spotify;
        this.template = Template.get("playlist");

        this.collection = new Backbone.Collection();
        this.listenTo(this.collection, 'reset', this.addAll);

        this.fetch();
    },

    render: function () {
        this.$el.html(this.template());
        var root = this.$el.find("tbody");
        _.each(this.getChildViews(), function (view) {
            root.append(view.render().el);
        }, this);
        return this;
    },

    fetch: function () {
        this.spotify.Playlists.playlists(_.bind(function (err, playlists) {
            if (err) {
                return;
            }

            this.collection.reset(playlists);
        }, this));
    },

    addAll: function () {
        this.closeChildViews();
        this.collection.each(this.addOne, this);
        this.render();
    },

    addOne: function (model) {
        var view = new PlaylistItemView({model: model});
        this.addChildView(view);
    }
});

PlaylistItemView = SpotifyTempo.View.extend({
    tagName: "tr",

    initialize: function () {
        this.template = Template.get("playlist-item");
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});
