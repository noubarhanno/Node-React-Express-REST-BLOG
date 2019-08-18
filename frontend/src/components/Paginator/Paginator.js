import React, { Component } from "react";

import "./Paginator.css";

class paginator extends Component {
  render() {
    return (
      <div className="paginator">
        {this.props.children}
        <div className="paginator__controls">
          {this.props.currentPage > 1 && (
            <button
              className="paginator__control"
              onClick={this.props.onPrevious}
            >
              Previous
            </button>
          )}
          {this.props.currentPage < this.props.lastPage && (
            <button className="paginator__control" onClick={this.props.onNext}>
              Next
            </button>
          )}
        </div>
      </div>
    );
  }
}

export default paginator;
