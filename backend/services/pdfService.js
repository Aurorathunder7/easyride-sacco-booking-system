const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');
const { promisePool } = require('../config/db');

class PDFService {
    constructor() {
        this.tempDir = path.join(__dirname, '../../temp');
        this.ticketsDir = path.join(__dirname, '../../tickets');
        this.receiptsDir = path.join(__dirname, '../../receipts');
        
        // Ensure directories exist
        fs.ensureDirSync(this.tempDir);
        fs.ensureDirSync(this.ticketsDir);
        fs.ensureDirSync(this.receiptsDir);
    }

    /**
     * Generate ticket PDF for a booking
     */
    async generateTicket(bookingId) {
        try {
            // Get booking details from database
            const [booking] = await promisePool.query(
                `SELECT 
                    b.bookingID,
                    b.bookingReference,
                    b.seatNumber,
                    b.travelDate,
                    b.totalAmount as amount,
                    b.createdAt as bookingDate,
                    c.customerName,
                    c.phoneNumber as customerPhone,
                    c.email as customerEmail,
                    c.idNumber as customerIdNumber,
                    r.origin,
                    r.destination,
                    r.routeCode,
                    r.distance,
                    r.estimatedTime,
                    v.vehicleNumber,
                    v.vehicleType,
                    v.capacity,
                    v.features,
                    op.operatorName as driverName,
                    op.phoneNum as driverPhone,
                    p.mpesaReceipt,
                    p.transactionDate
                 FROM bookings b
                 JOIN customers c ON b.customerID = c.custID
                 JOIN routes r ON b.routeID = r.routeID
                 JOIN vehicles v ON b.vehicleID = v.vehicleID
                 LEFT JOIN operators op ON v.operatorID = op.opID
                 LEFT JOIN payments p ON b.bookingID = p.bookingID
                 WHERE b.bookingID = ?`,
                [bookingId]
            );

            if (booking.length === 0) {
                throw new Error('Booking not found');
            }

            const data = booking[0];
            
            // Generate filename
            const filename = `ticket_${data.bookingReference}_${Date.now()}.pdf`;
            const filepath = path.join(this.ticketsDir, filename);
            
            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `EasyRide Ticket - ${data.bookingReference}`,
                    Author: 'EasyRide SACCO',
                    Subject: 'Bus Ticket',
                    Keywords: 'ticket, bus, travel',
                    CreationDate: new Date()
                }
            });

            // Pipe PDF to file
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Add content to PDF
            this.addTicketHeader(doc, data);
            this.addCustomerInfo(doc, data);
            this.addJourneyDetails(doc, data);
            this.addPaymentInfo(doc, data);
            this.addTermsAndConditions(doc);
            this.addFooter(doc);

            // Finalize PDF
            doc.end();

            // Wait for writing to complete
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            console.log(`✅ Ticket PDF generated: ${filename}`);

            return {
                success: true,
                filename,
                filepath,
                bookingReference: data.bookingReference
            };

        } catch (error) {
            console.error('❌ Generate ticket error:', error);
            throw error;
        }
    }

    /**
     * Generate receipt PDF for a payment
     */
    async generateReceipt(paymentId) {
        try {
            // Get payment details from database
            const [payment] = await promisePool.query(
                `SELECT 
                    p.*,
                    b.bookingReference,
                    b.travelDate,
                    b.seatNumber,
                    c.customerName,
                    c.phoneNumber as customerPhone,
                    r.origin,
                    r.destination,
                    v.vehicleNumber
                 FROM payments p
                 JOIN bookings b ON p.bookingID = b.bookingID
                 JOIN customers c ON b.customerID = c.custID
                 JOIN routes r ON b.routeID = r.routeID
                 JOIN vehicles v ON b.vehicleID = v.vehicleID
                 WHERE p.paymentID = ?`,
                [paymentId]
            );

            if (payment.length === 0) {
                throw new Error('Payment not found');
            }

            const data = payment[0];
            
            // Generate filename
            const filename = `receipt_${data.mpesaReceipt || data.paymentID}_${Date.now()}.pdf`;
            const filepath = path.join(this.receiptsDir, filename);
            
            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `EasyRide Receipt - ${data.mpesaReceipt || data.paymentID}`,
                    Author: 'EasyRide SACCO',
                    Subject: 'Payment Receipt',
                    Keywords: 'receipt, payment, mpesa',
                    CreationDate: new Date()
                }
            });

            // Pipe PDF to file
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            // Add content to PDF
            this.addReceiptHeader(doc, data);
            this.addPaymentDetails(doc, data);
            this.addBookingSummary(doc, data);
            this.addFooter(doc);

            // Finalize PDF
            doc.end();

            // Wait for writing to complete
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            console.log(`✅ Receipt PDF generated: ${filename}`);

            return {
                success: true,
                filename,
                filepath,
                receiptNumber: data.mpesaReceipt || data.paymentID
            };

        } catch (error) {
            console.error('❌ Generate receipt error:', error);
            throw error;
        }
    }

    /**
     * Generate daily report PDF
     */
    async generateDailyReport(date) {
        try {
            const reportDate = date || new Date().toISOString().split('T')[0];
            
            // Get report data
            const [summary] = await promisePool.query(
                `SELECT 
                    COUNT(*) as totalBookings,
                    SUM(CASE WHEN paymentStatus = 'paid' THEN totalAmount ELSE 0 END) as totalRevenue,
                    COUNT(DISTINCT customerID) as uniqueCustomers,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedBookings,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledBookings
                 FROM bookings 
                 WHERE DATE(createdAt) = ?`,
                [reportDate]
            );

            const [byRoute] = await promisePool.query(
                `SELECT 
                    r.routeCode,
                    r.origin,
                    r.destination,
                    COUNT(*) as bookings,
                    SUM(b.totalAmount) as revenue
                 FROM bookings b
                 JOIN routes r ON b.routeID = r.routeID
                 WHERE DATE(b.createdAt) = ?
                 GROUP BY r.routeID`,
                [reportDate]
            );

            const filename = `daily_report_${reportDate}.pdf`;
            const filepath = path.join(this.receiptsDir, filename);
            
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50
            });

            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);

            this.addReportHeader(doc, reportDate);
            this.addReportSummary(doc, summary[0]);
            this.addRouteBreakdown(doc, byRoute);
            this.addFooter(doc);

            doc.end();

            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            return {
                success: true,
                filename,
                filepath
            };

        } catch (error) {
            console.error('❌ Generate report error:', error);
            throw error;
        }
    }

    /**
     * Add ticket header
     */
    addTicketHeader(doc, data) {
        // Company logo/name
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text('EASY RIDE SACCO', { align: 'center' })
           .moveDown(0.5);
        
        doc.fontSize(18)
           .fillColor('#1f2937')
           .text('BOARDING PASS', { align: 'center' })
           .moveDown(1);

        // Ticket reference
        doc.fontSize(12)
           .fillColor('#4b5563')
           .text(`Ticket No: ${data.bookingReference}`, { align: 'right' })
           .moveDown(0.5);
    }

    /**
     * Add customer information
     */
    addCustomerInfo(doc, data) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text('PASSENGER DETAILS', { underline: true })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#1f2937')
           .text(`Name: ${data.customerName}`)
           .text(`Phone: ${data.customerPhone}`)
           .text(`Email: ${data.customerEmail || 'N/A'}`)
           .text(`ID Number: ${data.customerIdNumber || 'N/A'}`)
           .moveDown(1);
    }

    /**
     * Add journey details
     */
    addJourneyDetails(doc, data) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text('JOURNEY DETAILS', { underline: true })
           .moveDown(0.5);

        // Create a table-like structure
        const startX = doc.x;
        let y = doc.y;

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Route:', startX, y)
           .font('Helvetica')
           .text(`${data.origin} → ${data.destination}`, startX + 100, y);

        y += 20;
        doc.font('Helvetica-Bold')
           .text('Route Code:', startX, y)
           .font('Helvetica')
           .text(data.routeCode, startX + 100, y);

        y += 20;
        doc.font('Helvetica-Bold')
           .text('Date:', startX, y)
           .font('Helvetica')
           .text(new Date(data.travelDate).toLocaleDateString('en-KE'), startX + 100, y);

        y += 20;
        doc.font('Helvetica-Bold')
           .text('Time:', startX, y)
           .font('Helvetica')
           .text(new Date(data.travelDate).toLocaleTimeString('en-KE'), startX + 100, y);

        y += 20;
        doc.font('Helvetica-Bold')
           .text('Seat No:', startX, y)
           .font('Helvetica')
           .text(data.seatNumber, startX + 100, y);

        y += 20;
        doc.font('Helvetica-Bold')
           .text('Vehicle:', startX, y)
           .font('Helvetica')
           .text(`${data.vehicleNumber} (${data.vehicleType})`, startX + 100, y);

        y += 20;
        doc.font('Helvetica-Bold')
           .text('Driver:', startX, y)
           .font('Helvetica')
           .text(data.driverName || 'To be assigned', startX + 100, y);

        y += 20;
        doc.font('Helvetica-Bold')
           .text('Distance:', startX, y)
           .font('Helvetica')
           .text(data.distance ? `${data.distance} km` : 'N/A', startX + 100, y);

        y += 20;
        doc.font('Helvetica-Bold')
           .text('Duration:', startX, y)
           .font('Helvetica')
           .text(data.estimatedTime || 'N/A', startX + 100, y);

        doc.moveDown(2);
    }

    /**
     * Add payment information
     */
    addPaymentInfo(doc, data) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text('PAYMENT DETAILS', { underline: true })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#1f2937')
           .text(`Amount Paid: KES ${data.amount.toLocaleString()}`)
           .text(`Payment Status: ${data.paymentStatus || 'Pending'}`);

        if (data.mpesaReceipt) {
            doc.text(`M-Pesa Receipt: ${data.mpesaReceipt}`)
               .text(`Payment Date: ${new Date(data.transactionDate).toLocaleString('en-KE')}`);
        }

        doc.moveDown(1);
    }

    /**
     * Add receipt header
     */
    addReceiptHeader(doc, data) {
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text('EASY RIDE SACCO', { align: 'center' })
           .moveDown(0.5);
        
        doc.fontSize(18)
           .fillColor('#1f2937')
           .text('PAYMENT RECEIPT', { align: 'center' })
           .moveDown(1);

        doc.fontSize(12)
           .fillColor('#4b5563')
           .text(`Receipt No: ${data.mpesaReceipt || data.paymentID}`, { align: 'right' })
           .moveDown(0.5);
    }

    /**
     * Add payment details to receipt
     */
    addPaymentDetails(doc, data) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text('PAYMENT DETAILS', { underline: true })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#1f2937')
           .text(`Amount: KES ${data.amount.toLocaleString()}`)
           .text(`Payment Method: M-Pesa`)
           .text(`Transaction ID: ${data.mpesaReference || 'N/A'}`)
           .text(`Receipt Number: ${data.mpesaReceipt || 'N/A'}`)
           .text(`Date: ${new Date(data.transactionDate || data.createdAt).toLocaleString('en-KE')}`)
           .text(`Phone Number: ${data.phoneNumber}`)
           .moveDown(1);
    }

    /**
     * Add booking summary to receipt
     */
    addBookingSummary(doc, data) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text('BOOKING SUMMARY', { underline: true })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#1f2937')
           .text(`Booking Reference: ${data.bookingReference}`)
           .text(`Route: ${data.origin} → ${data.destination}`)
           .text(`Travel Date: ${new Date(data.travelDate).toLocaleDateString('en-KE')}`)
           .text(`Seat: ${data.seatNumber}`)
           .text(`Vehicle: ${data.vehicleNumber}`)
           .moveDown(1);
    }

    /**
     * Add report header
     */
    addReportHeader(doc, date) {
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text('EASY RIDE SACCO', { align: 'center' })
           .moveDown(0.5);
        
        doc.fontSize(18)
           .fillColor('#1f2937')
           .text('DAILY REPORT', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(12)
           .fillColor('#4b5563')
           .text(`Date: ${new Date(date).toLocaleDateString('en-KE', { 
               weekday: 'long', 
               year: 'numeric', 
               month: 'long', 
               day: 'numeric' 
           })}`, { align: 'center' })
           .moveDown(1);
    }

    /**
     * Add report summary
     */
    addReportSummary(doc, summary) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text('SUMMARY', { underline: true })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#1f2937')
           .text(`Total Bookings: ${summary.totalBookings || 0}`)
           .text(`Confirmed Bookings: ${summary.confirmedBookings || 0}`)
           .text(`Cancelled Bookings: ${summary.cancelledBookings || 0}`)
           .text(`Unique Customers: ${summary.uniqueCustomers || 0}`)
           .text(`Total Revenue: KES ${(summary.totalRevenue || 0).toLocaleString()}`)
           .moveDown(1);
    }

    /**
     * Add route breakdown to report
     */
    addRouteBreakdown(doc, routes) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text('ROUTE BREAKDOWN', { underline: true })
           .moveDown(0.5);

        // Table header
        const startX = doc.x;
        let y = doc.y;

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('Route', startX, y)
           .text('Bookings', startX + 150, y)
           .text('Revenue', startX + 250, y);

        y += 20;
        doc.strokeColor('#e5e7eb')
           .lineWidth(1)
           .moveTo(startX, y - 5)
           .lineTo(startX + 350, y - 5)
           .stroke();

        // Table rows
        routes.forEach((route, index) => {
            y += 20;
            doc.font('Helvetica')
               .fillColor('#4b5563')
               .text(`${route.origin} → ${route.destination}`, startX, y)
               .text(route.bookings.toString(), startX + 150, y)
               .text(`KES ${(route.revenue || 0).toLocaleString()}`, startX + 250, y);
        });

        doc.moveDown(2);
    }

    /**
     * Add terms and conditions
     */
    addTermsAndConditions(doc) {
        doc.addPage()
           .fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text('TERMS AND CONDITIONS', { align: 'center' })
           .moveDown(1);

        const terms = [
            '1. Ticket is valid only for the specified date and time.',
            '2. Passengers must arrive at least 30 minutes before departure.',
            '3. Tickets are non-transferable without prior approval.',
            '4. Cancellations made less than 2 hours before departure are non-refundable.',
            '5. EasyRide SACCO reserves the right to reschedule or cancel trips due to unforeseen circumstances.',
            '6. Luggage is carried at owner\'s risk.',
            '7. Smoking and alcohol consumption are strictly prohibited on board.',
            '8. Passengers must fasten seatbelts at all times during the journey.',
            '9. In case of lost ticket, please contact our customer service immediately.',
            '10. For any queries or complaints, contact our 24/7 customer support.'
        ];

        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#4b5563');

        terms.forEach(term => {
            doc.text(term).moveDown(0.5);
        });
    }

    /**
     * Add footer
     */
    addFooter(doc) {
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            
            // Add line
            doc.strokeColor('#e5e7eb')
               .lineWidth(1)
               .moveTo(50, doc.page.height - 50)
               .lineTo(doc.page.width - 50, doc.page.height - 50)
               .stroke();

            // Add footer text
            doc.fontSize(9)
               .fillColor('#9ca3af')
               .text(
                   'EasyRide SACCO - Your Trusted Travel Partner',
                   50,
                   doc.page.height - 40,
                   { align: 'center', width: doc.page.width - 100 }
               )
               .text(
                   'Contact: 0700 123 456 | Email: support@easyride.co.ke | Web: www.easyride.co.ke',
                   50,
                   doc.page.height - 25,
                   { align: 'center', width: doc.page.width - 100 }
               );
        }
    }

    /**
     * Get ticket file path
     */
    getTicketPath(filename) {
        return path.join(this.ticketsDir, filename);
    }

    /**
     * Get receipt file path
     */
    getReceiptPath(filename) {
        return path.join(this.receiptsDir, filename);
    }

    /**
     * Clean up old files
     */
    async cleanupOldFiles(days = 7) {
        try {
            const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
            
            const cleanupDir = async (dir) => {
                const files = await fs.readdir(dir);
                
                for (const file of files) {
                    const filepath = path.join(dir, file);
                    const stats = await fs.stat(filepath);
                    
                    if (stats.mtimeMs < cutoff) {
                        await fs.unlink(filepath);
                        console.log(`🧹 Deleted old file: ${file}`);
                    }
                }
            };

            await cleanupDir(this.ticketsDir);
            await cleanupDir(this.receiptsDir);

            console.log(`✅ Cleaned up files older than ${days} days`);

        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

module.exports = new PDFService();