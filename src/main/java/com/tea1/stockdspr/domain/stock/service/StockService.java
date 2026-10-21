package com.tea1.stockdspr.domain.stock.service;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import com.tea1.stockdspr.domain.facility.repository.FacilityRepository;
import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.domain.stock.dto.StockRequestDTO;
import com.tea1.stockdspr.domain.stock.dto.StockResponseDTO;
import com.tea1.stockdspr.domain.stock.dto.StockUpdateDTO;
import com.tea1.stockdspr.domain.stock.entity.Stock;
import com.tea1.stockdspr.domain.stock.repository.StockRepository;
import com.tea1.stockdspr.global.response.exception.CustomException;
import com.tea1.stockdspr.global.response.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockService {

    private final StockRepository stockRepository;
    private final ItemRepository itemRepository;
    private final FacilityRepository facilityRepository;

    @Transactional
    public Long createStock(Long itemId, StockRequestDTO stockRequestDTO) {

        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이템입니다"));

        //로그인 구현 후 삭제 예정
        Facility facility = facilityRepository.findById(stockRequestDTO.getFacilityId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지점입니다"));

        Stock stock = Stock.builder()
                .item(item)
                .facility(facility)
                .onHandQty(stockRequestDTO.getOnHandQty())
                .expirationDate(stockRequestDTO.getExpirationDate()).build();

        Stock savedStock = stockRepository.save(stock);

        return savedStock.getId();
    }

    @Transactional
    public void updateStock(Long stockId, StockUpdateDTO dto) {

        Stock s = stockRepository.findById(stockId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 재고입니다"));

        s.stockUpdateInfo(dto.getOnHandQty(), dto.getExpirationDate(), dto.getUsageStatus());
    }

    public List<StockResponseDTO> findStocks() {

        List<Stock> stocks = stockRepository.findAll();
        return stocks.stream()
                .map(s -> StockResponseDTO.builder()
                        .id(s.getId())
                        .onHandQty(s.getOnHandQty())
                        .expirationDate(s.getExpirationDate())
                        .usageStatus(s.getUsageStatus()).build()).toList();
    }

    @Transactional
    public void deleteStock(Long stockId) {
        Stock s = stockRepository.findById(stockId)
                .orElseThrow(() -> new CustomException(ErrorCode.STOCK_NOT_FOUND));

        stockRepository.delete(s);
    }
}