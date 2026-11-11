package com.tea1.stockdspr.domain.stock.cache;

import com.tea1.stockdspr.domain.stock.dto.StockResponseDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Component
@RequiredArgsConstructor
public class StockCache {

    private static final String KEY_PREFIX = "stock:item:";
    private static final TypeReference<List<StockResponseDTO>> LIST_TYPE = new TypeReference<>() {};
    private static final long TTL_SECONDS = 300; //5분
    private static final long JITTER_SECONDS = 30;

    private final StringRedisTemplate redisTemplate;
    private final JsonMapper jsonMapper;

    private String key(Long itemId) {
        return KEY_PREFIX + itemId;
    }

    //캐시에 있으면 꺼내고, 없거나 Redis오류면 빈 Optional
    public Optional<List<StockResponseDTO>> get(Long itemId) {

        try {
            String json = redisTemplate.opsForValue().get(key(itemId));
            if (json == null) {
                return Optional.empty();
            }
            return Optional.of(jsonMapper.readValue(json, LIST_TYPE));
        } catch (RuntimeException e) {
            log.warn("재고 캐시 조회 실패 itemId={}", itemId, e);
            return Optional.empty();
        }
    }

    public void put(Long itemId, List<StockResponseDTO> stocks) {
        try {
            String json = jsonMapper.writeValueAsString(stocks);
            // key가 같은 시간에 만료되면 DB에 몰리기 때문
            long ttl = TTL_SECONDS + ThreadLocalRandom.current().nextLong(JITTER_SECONDS + 1);
            redisTemplate.opsForValue().set(key(itemId), json, Duration.ofSeconds(ttl));
        } catch (RuntimeException e) {
            log.warn("재고 캐시 저장 실패 itemId={}", itemId, e);
        }
    }

    //트랜잭션 안이면 커밋 후에, 밖이면 바로 지움. 롤백되면 안 지움
    public void evictAfterCommit(Long itemId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    evict(itemId);
                }
            });
        } else {
            evict(itemId);
        }
    }

    private void evict(Long itemId) {
        try {
            redisTemplate.delete(key(itemId));
        } catch (RuntimeException e) {
            log.warn("재고 캐시 삭제 실패 itemId={} (TTL 지나면 사라짐)", itemId, e);
        }
    }
}
