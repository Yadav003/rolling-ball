window.Collision = {
  update(player, track) {
    if (player.falling) return;

    // Check boundary condition
    if (!track.containsPlayer(player.x, player.z, player.radius)) {
      player.triggerFall();
      if (window.UI) {
        window.UI.setGameOverReason("The ball fell from the track.");
      }
    }
  }
};
