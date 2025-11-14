#include "memory_pool.h"

namespace vrewcraft {

AVFramePool::AVFramePool(size_t initial_size)
  : total_allocated_(0) {
  // Pre-allocate frames
  for (size_t i = 0; i < initial_size; ++i) {
    AVFramePtr frame = make_av_frame();
    if (frame) {
      available_frames_.push_back(std::move(frame));
      total_allocated_++;
    }
  }
}

AVFramePtr AVFramePool::acquire() {
  std::lock_guard<std::mutex> lock(mutex_);

  if (available_frames_.empty()) {
    // Pool is empty, allocate new frame
    AVFramePtr frame = make_av_frame();
    if (frame) {
      total_allocated_++;
    }
    return frame;
  }

  // Reuse frame from pool
  AVFramePtr frame = std::move(available_frames_.back());
  available_frames_.pop_back();

  // Reset frame data
  av_frame_unref(frame.get());

  return frame;
}

void AVFramePool::release(AVFramePtr frame) {
  if (!frame) {
    return;
  }

  std::lock_guard<std::mutex> lock(mutex_);

  // Reset frame and return to pool
  av_frame_unref(frame.get());
  available_frames_.push_back(std::move(frame));
}

AVFramePool::Stats AVFramePool::get_stats() const {
  std::lock_guard<std::mutex> lock(mutex_);

  Stats stats;
  stats.total_allocated = total_allocated_;
  stats.available = available_frames_.size();
  stats.in_use = total_allocated_ - available_frames_.size();

  return stats;
}

} // namespace vrewcraft
