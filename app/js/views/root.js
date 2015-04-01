RootView = SpotifyTempo.View.extend({
    initialize: function () {
        this.template = Template.get("root");
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    }
});