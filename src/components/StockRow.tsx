import { Link } from 'react-router-dom'
import type { Stock } from '../data/mockMarket'
import { formatChange, formatCurrency } from '../data/mockMarket'
import './StockRow.css'

type StockRowProps = {
  stock: Stock
  subtitle?: string
}

export function StockRow({ stock, subtitle }: StockRowProps) {
  const isUp = stock.change >= 0

  return (
    <Link to={`/stock/${stock.symbol}`} className="stock-row">
      <div className="stock-row-body">
        <span className="stock-row-symbol">{stock.symbol}</span>
        <span className="stock-row-name">{subtitle ?? stock.name}</span>
      </div>
      <div className="stock-row-quote">
        <span className="stock-row-price">{formatCurrency(stock.price)}</span>
        <span className={`stock-row-change${isUp ? ' stock-row-change--up' : ' stock-row-change--down'}`}>
          {formatChange(stock.change, stock.changePercent)}
        </span>
      </div>
    </Link>
  )
}
