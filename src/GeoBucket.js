class GeoBucket {
 
  constructor(position, options) {
    this.position = position;
    this.options = options;
    this.nodes = new Set();
  }
  
  move(position) {
    this.position = position;
    var unfollowers = false;
    for(var node of this.nodes) {
      if(!this.follows(node.descriptor.position)) {
        this.remove(node);
        unfollowers = true;
      }
    }
    return unfollowers;
  }
  
  update(node) {
    var n = this.get(node.descriptor);
    if(n !== null && n.descriptor.position.timestamp < node.descriptor.position.timestamp) {
      n.descriptor = node.descriptor;
      return true;
    } else {
      return false;
    }
  }
  
  has(node) {
    for(var n of this.nodes) {
      if(n.descriptor.key === node.descriptor.key) {
        return true;
      }
    }
    return false;
  }
  
  follows(position) {
    return GeoBucket.checkAffinity(this.position, position, this.options);
  }
  
  get(descriptor) {
    for(var node of this.nodes) {
      if(node.descriptor.key === descriptor.key) {
        return node;
      }
    }
    return null;
  }
  
  add(node) {
    if(this.has(node)) {
      return this.update(node);
    } else {
      if(this.nodes.size >= this.options.upper_limit) {
        var oldestNode = this.nodes.values().next().value;
        for(var n of this.nodes) {
          if(n.descriptor.position.timestamp < oldestNode.descriptor.position.timestamp) {
            oldestNode = n;
          }
        }
        if(node.descriptor.position.timestamp <= oldestNode.descriptor.position.timestamp) {
          return false;
        } else {
          this.remove(oldestNode);
          this.nodes.add(node);
          return true;
        }
      } else {
        this.nodes.add(node);
        return true;
      }
    }
  }
  
  remove(node) {
    if(this.has(node)) {
      node.disconnect();
      this.nodes.delete(node);
      return true;
    } else {
      return false;
    }
  }

  removeAll() {
    for(var node of this.nodes) {
      node.disconnect();
    }
    this.nodes.clear();
  }
  
  retrieve(position, limit) {
    var nodes = [];
		for(var node of this.nodes) {
      if(nodes.length >= limit) {
        break;
      } else {
        if(GeoBucket.checkAffinity(node.descriptor.position, position, this.options)) {
          nodes.push(node);
        }
      }
    }				
		return new Set(nodes.slice(0, limit));
  }
  
  size() {
    return this.nodes.size;
  }
  
  geocast(data) {
    for(var node of this.nodes) {
			var message = new DataMessage(node.peer.descriptor, this.position, data);
      if(node.isConnected()) {
        node.send(message);
      }
    }
  }
  
  descriptors() {
    var descriptors = [];
		for(var node of this.nodes) {
			descriptors.push(node.descriptor);
		}
    return descriptors;
  }
  
  static checkAffinity(position1, position2, options) {
    return (Geography.distance(position1.coords.latitude, position1.coords.longitude, position2.coords.latitude, position2.coords.longitude) <= 2 * options.radius);
  }

}