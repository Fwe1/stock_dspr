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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StockService {

    private final StockRepository stockRepository;
    private final ItemRepository itemRepository;
    private final FacilityRepository facilityRepository;

    public Long createStock(StockRequestDTO stockRequestDTO) {

        Item item = itemRepository.findById(stockRequestDTO.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이템입니다"));

        //로그인 구현 후 삭제 예정
        Facility facility = facilityRepository.findById(stockRequestDTO.getFacilityId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지점입니다"));

        Stock stock = Stock.builder()
                .item(item)
                .facility(facility)
                .onHandQty(stockRequestDTO.getOnHandQty())
                .expirationDate(stockRequestDTO.getExpirationDate()).build();

        return stock.getId();
    }

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

    public void deleteStock(Long stockId) {

    }

}
