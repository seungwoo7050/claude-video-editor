#ifndef MEMORY_POOL_H
#define MEMORY_POOL_H

#include "ffmpeg_raii.h"
#include <vector>
#include <mutex>
#include <memory>

namespace vrewcraft {

/**
 * Memory pool for AVFrame reuse (Arena60 MVP 2.0 pattern)
 * Reduces allocation overhead for high-frequency operations like thumbnail extraction
 */
class AVFramePool {
public:
  explicit AVFramePool(size_t initial_size = 10);
  ~AVFramePool() = default;

  /**
   * Acquire a frame from the pool
   * If pool is empty, allocates a new frame
   */
  AVFramePtr acquire();

  /**
   * Release a frame back to the pool
   * Frame is reset and made available for reuse
   */
  void release(AVFramePtr frame);

  /**
   * Get current pool statistics
   */
  struct Stats {
    size_t total_allocated;
    size_t available;
    size_t in_use;
  };
  Stats get_stats() const;

private:
  std::vector<AVFramePtr> available_frames_;
  mutable std::mutex mutex_;
  size_t total_allocated_;
};

} // namespace vrewcraft

#endif // MEMORY_POOL_H
