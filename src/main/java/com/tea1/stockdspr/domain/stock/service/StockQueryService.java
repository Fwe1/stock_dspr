package com.tea1.stockdspr.domain.stock.service;

import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.domain.stock.cache.StockCache;
import com.tea1.stockdspr.domain.stock.dto.StockResponseDTO;
import com.tea1.stockdspr.domain.stock.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

// @Transcational 없는 이유 = 캐시 hit면 DB커넥션을 빌리지 않기 때문
@Service
@RequiredArgsConstructor
public class StockQueryService {

    private final StockCache stockCache;
    private final StockService stockService;

    public List<StockResponseDTO> findStockByItem(Long itemId) {

        Optional<List<StockResponseDTO>> cached = stockCache.get(itemId);
        if (cached.isPresent()) {
            //hit
            return cached.get();
        }

        //miss
        List<StockResponseDTO> result = stockService.findStockByItem(itemId);
        stockCache.put(itemId, result);
        return result;
    }
}
