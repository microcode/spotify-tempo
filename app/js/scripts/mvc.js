SpotifyTempo = {};

SpotifyTempo.View = Backbone.View.extend({
    close: function () {
        if (this.onClose) {
            this.onClose();
        }

        this.closeChildViews();

        this.remove();
        this.unbind();
    },

    closeChildViews: function () {
        _.each(this._childViews, function (view) {
            view.close();
        });
        delete this._childViews;
    },

    addChildView: function (view) {
        var childViews = this._childViews || (this._childViews = []);
        childViews.push(view);
    },

    getChildViews: function () {
        return this._childViews ? _.clone(this._childViews) : [];
    }
});

SpotifyTempo.Router = Backbone.Router.extend({
    showView: function (anchor, view) {
        if (this._activeView) {
            this._activeView.close();
            delete this._activeView;
        }

        if (view) {
            $(anchor).html(view.render().el);
            this._activeView = view;
        }
    }
});
