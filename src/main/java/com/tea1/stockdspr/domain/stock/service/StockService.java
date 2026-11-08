package com.tea1.stockdspr.domain.stock.service;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import com.tea1.stockdspr.domain.facility.repository.FacilityRepository;
import com.tea1.stockdspr.domain.stock.dto.LotReceiptRequest;
import com.tea1.stockdspr.domain.stock.entity.LotReceipt;
import com.tea1.stockdspr.domain.stock.repository.LotReceiptRepository;
import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.domain.reservation.repository.ReservationRepository;
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
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockService {

    private final StockRepository stockRepository;
    private final ItemRepository itemRepository;
    private final FacilityRepository facilityRepository;
    private final ReservationRepository reservationRepository;

    private final LotReceiptRepository receiptRepository;

    @Transactional
    public Long receiveLot(Long facilityId, Long itemId, LotReceiptRequest request) {
        // Serialize the first receipt too, when there is no lot row to lock yet.
        Facility facility = facilityRepository.lockForReceipt(facilityId)
                .orElseThrow(() -> new CustomException(ErrorCode.FACILITY_NOT_FOUND));
        var prior = receiptRepository.findByFacilityIdAndRequestId(facilityId, request.requestId());
        if (prior.isPresent()) {
            if (!prior.get().matches(itemId, request)) {
                throw new CustomException(ErrorCode.RECEIPT_CONFLICT);
            }
            return prior.get().getStockId();
        }
        if (request.expirationDate().isBefore(LocalDate.now())) {
            throw new CustomException(ErrorCode.LOT_EXPIRED);
        }
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new CustomException(ErrorCode.ITEM_NOT_FOUND));
        Stock stock = stockRepository.findByFacility_IdAndItem_IdAndLotNumber(facilityId, itemId, request.lotNumber())
                .orElseGet(() -> Stock.builder().facility(facility).item(item).lotNumber(request.lotNumber())
                        .expirationDate(request.expirationDate()).build());
        stock.receive(request.quantity(), request.expirationDate());
        Stock saved = stockRepository.save(stock);
        receiptRepository.save(new LotReceipt(saved, request));
        return saved.getId();
    }

    @Transactional
    public Long createStock(Long itemId, StockRequestDTO stockRequestDTO) {

        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new CustomException(ErrorCode.ITEM_NOT_FOUND));

        //로그인 구현 후 삭제 예정
        Facility facility = facilityRepository.findById(stockRequestDTO.getFacilityId())
                .orElseThrow(() -> new CustomException(ErrorCode.FACILITY_NOT_FOUND));

        Stock stock = Stock.builder()
                .item(item)
                .facility(facility)
                .onHandQty(stockRequestDTO.getOnHandQty())
                .expirationDate(stockRequestDTO.getExpirationDate()).build();

        Stock savedStock = stockRepository.save(stock);

        return savedStock.getId();
    }


    public StockResponseDTO findOne(Long stockId) {

        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new CustomException(ErrorCode.STOCK_NOT_FOUND));

        return toResponseDTO(stock);

    }

    public List<StockResponseDTO> findStockByItem(Long itemId) {
        if (!itemRepository.existsById(itemId)) {
            throw new CustomException(ErrorCode.ITEM_NOT_FOUND);
        }
        return stockRepository.findByItemId(itemId).stream()
                .map(this::toResponseDTO)
                .toList();
    }

    public List<StockResponseDTO> findByFacilityAndItem(Long facilityId, Long itemId) {
        if (!facilityRepository.existsById(facilityId)) {
            throw new CustomException(ErrorCode.FACILITY_NOT_FOUND);
        }
        if (!itemRepository.existsById(itemId)) {
            throw new CustomException(ErrorCode.ITEM_NOT_FOUND);
        }
        return stockRepository.findByFacility_IdAndItem_IdOrderById(facilityId, itemId)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    //조립 용도
    private StockResponseDTO toResponseDTO(Stock stock) {
        return StockResponseDTO.builder()
                .id(stock.getId())
                .lotNumber(stock.getLotNumber())
                .onHandQty(stock.getOnHandQty())
                .expirationDate(stock.getExpirationDate())
                .reservedQty(stock.getReservedQty())
                .usageStatus(stock.getUsageStatus())
                .build();
    }



    @Transactional
    public void updateStock(Long stockId, StockUpdateDTO dto) {

        Stock s = stockRepository.findById(stockId)
                .orElseThrow(() -> new CustomException(ErrorCode.STOCK_NOT_FOUND));

        s.stockUpdateInfo(dto.getOnHandQty(), dto.getExpirationDate());
    }

    public List<StockResponseDTO> findStocks() {

        List<Stock> stocks = stockRepository.findAll();
        return stocks.stream()
                .map(this::toResponseDTO).toList();
    }

    @Transactional
    public void deleteStock(Long stockId) {
        Stock s = stockRepository.findById(stockId)
                .orElseThrow(() -> new CustomException(ErrorCode.STOCK_NOT_FOUND));

        //예약 이력이 있는 재고는 FK 때문에 지울 수 없음
        if (reservationRepository.existsByStock_Id(stockId)) {
            throw new CustomException(ErrorCode.STOCK_HAS_RESERVATION);
        }

        stockRepository.delete(s);
    }

    @Transactional
    public void discardStock(Long stockId) {
        Stock s = stockRepository.findById(stockId)
                .orElseThrow(() -> new CustomException(ErrorCode.STOCK_NOT_FOUND));

        s.discardStock();
    }
}
