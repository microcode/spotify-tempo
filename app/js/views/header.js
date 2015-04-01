HeaderView = SpotifyTempo.View.extend({
    initialize: function () {
        this.template = Template.get("header");
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    }
});
